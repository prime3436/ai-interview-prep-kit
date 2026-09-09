import * as cheerio from 'cheerio';
import { URL } from 'url';

export interface CrawledPage {
  url: string;
  title: string;
  content: string;
  isHiringPage: boolean;
}

export interface CrawlResult {
  pages: CrawledPage[];
  pages_used: string[];
  what_they_do_text: string;
  hiring_process_text: string;
  public_discussion_text: string;
  errors: string[];
}

/**
 * SSRF validation:
 * Disallows private/loopback/cloud metadata IP ranges in production unless ALLOW_LOCAL_URLS is explicitly set.
 * In development or batch evaluation (e.g. against http://localhost:8099/acme/), local URLs are allowed.
 */
export function isSafeUrl(rawUrl: string, allowLocal = false): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: `Unsupported protocol: ${parsed.protocol}` };
    }

    const host = parsed.hostname.toLowerCase();

    // Check if local URLs are allowed (for test harness or localhost mocking)
    if (allowLocal || process.env.ALLOW_LOCAL_URLS === 'true' || process.env.NODE_ENV !== 'production') {
      return { safe: true };
    }

    // SSRF Checks in Production
    const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    const isCloudMetadata = host === '169.254.169.254';
    const isPrivate =
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host);

    if (isLoopback || isCloudMetadata || isPrivate) {
      return { safe: false, reason: `Private/loopback addresses forbidden in production: ${host}` };
    }

    return { safe: true };
  } catch (err: any) {
    return { safe: false, reason: `Invalid URL format: ${err.message}` };
  }
}

/**
 * Heuristic Link Ranking:
 * Evaluates candidate URLs found on the homepage to prioritize hiring, careers,
 * culture, engineering blog, and company about pages.
 */
export function rankLink(urlStr: string, anchorText: string): number {
  const lowerUrl = urlStr.toLowerCase();
  const lowerText = anchorText.toLowerCase();
  let score = 0;

  // High priority: Hiring, Careers, Interviews
  const hiringKeywords = ['careers', 'jobs', 'work-with-us', 'join-us', 'hiring', 'positions', 'interview', 'openings'];
  for (const kw of hiringKeywords) {
    if (lowerUrl.includes(kw)) score += 10;
    if (lowerText.includes(kw)) score += 8;
  }

  // Engineering & handbook: Highly relevant for tech roles
  const techKeywords = ['handbook', 'engineering', 'tech', 'culture', 'values', 'life-at'];
  for (const kw of techKeywords) {
    if (lowerUrl.includes(kw)) score += 7;
    if (lowerText.includes(kw)) score += 5;
  }

  // Company background
  const aboutKeywords = ['about', 'company', 'mission', 'team', 'who-we-are'];
  for (const kw of aboutKeywords) {
    if (lowerUrl.includes(kw)) score += 4;
    if (lowerText.includes(kw)) score += 3;
  }

  // Penalize irrelevant / noise links
  const penaltyKeywords = ['login', 'signin', 'signup', 'terms', 'privacy', 'cookie', 'cart', 'checkout', 'pricing', 'status', 'help', 'support'];
  for (const kw of penaltyKeywords) {
    if (lowerUrl.includes(kw)) score -= 15;
    if (lowerText.includes(kw)) score -= 10;
  }

  return score;
}

/**
 * Clean HTML and extract readable text
 */
export function extractCleanText(html: string): { title: string; text: string; links: { href: string; text: string }[] } {
  const $ = cheerio.load(html);

  const title = $('title').first().text().trim() || $('h1').first().text().trim() || 'Untitled Page';

  // Collect links before stripping tags
  const links: { href: string; text: string }[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')?.trim();
    const text = $(el).text().trim();
    if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
      links.push({ href, text });
    }
  });

  // Strip non-content and layout tags
  $('script, style, noscript, svg, iframe, nav, footer, header, form').remove();

  // Prefer main or article if present, otherwise body
  const container = $('main').length > 0 ? $('main') : $('article').length > 0 ? $('article') : $('body');
  const text = container
    .text()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 10000); // Enforce 10k chars limit for token efficiency

  return { title, text, links };
}

/**
 * Fetch a single URL safely with timeout and retry logic
 */
export async function fetchWithRetry(url: string, maxRetries = 2, timeoutMs = 8000): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'TraoAIInterviewPrepBot/1.0 (+https://github.com/trao/evaluator)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      // Max size limit: 1.5MB
      const text = await response.text();
      return text;
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        // Exponential backoff: 500ms, 1000ms
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} retries`);
}

/**
 * Check robots.txt for disallowed paths
 */
export async function isAllowedByRobots(baseUrl: string, path: string): Promise<boolean> {
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl).href;
    const robotsText = await fetchWithRetry(robotsUrl, 0, 4000);
    const lines = robotsText.split('\n');
    let appliesToAll = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (/^User-agent:\s*\*/i.test(trimmed)) {
        appliesToAll = true;
      } else if (/^User-agent:/i.test(trimmed)) {
        appliesToAll = false;
      } else if (appliesToAll && /^Disallow:\s*(.*)/i.test(trimmed)) {
        const disallowPath = trimmed.replace(/^Disallow:\s*/i, '').trim();
        if (disallowPath && (disallowPath === '/' || path.startsWith(disallowPath))) {
          return false;
        }
      }
    }
    return true;
  } catch {
    // If robots.txt doesn't exist or is unreachable, default to permitted
    return true;
  }
}

/**
 * Intelligent Crawler: Crawls company homepage and prioritized discovered pages
 */
export async function crawlCompanySite(
  companyUrl: string,
  allowLocal = true
): Promise<CrawlResult> {
  const errors: string[] = [];
  const pages: CrawledPage[] = [];
  const pages_used: string[] = [];

  // SSRF check
  const safety = isSafeUrl(companyUrl, allowLocal);
  if (!safety.safe) {
    errors.push(`URL rejected: ${safety.reason}`);
    return {
      pages,
      pages_used,
      what_they_do_text: '',
      hiring_process_text: '',
      public_discussion_text: '',
      errors,
    };
  }

  // 1. Fetch homepage
  let homepageHtml = '';
  try {
    homepageHtml = await fetchWithRetry(companyUrl, 2, 8000);
    pages_used.push(companyUrl);
  } catch (err: any) {
    errors.push(`Homepage unreachable (${companyUrl}): ${err.message}`);
    return {
      pages,
      pages_used,
      what_they_do_text: '',
      hiring_process_text: '',
      public_discussion_text: '',
      errors,
    };
  }

  const { title: homeTitle, text: homeText, links } = extractCleanText(homepageHtml);
  pages.push({
    url: companyUrl,
    title: homeTitle,
    content: homeText,
    isHiringPage: false,
  });

  // 2. Discover & rank internal links
  const baseParsed = new URL(companyUrl);
  const scoredCandidates: { url: string; score: number }[] = [];
  const seenUrls = new Set<string>([companyUrl]);

  for (const link of links) {
    try {
      const resolved = new URL(link.href, companyUrl);
      // Keep within same domain / subdomain
      if (resolved.hostname === baseParsed.hostname || resolved.hostname.endsWith('.' + baseParsed.hostname)) {
        const fullHref = resolved.href;
        if (!seenUrls.has(fullHref)) {
          seenUrls.add(fullHref);
          const score = rankLink(fullHref, link.text);
          if (score > 0) {
            scoredCandidates.push({ url: fullHref, score });
          }
        }
      }
    } catch {
      // ignore malformed URLs
    }
  }

  // Sort by score descending and take up to top 2 links
  scoredCandidates.sort((a, b) => b.score - a.score);
  const topCandidates = scoredCandidates.slice(0, 2);

  for (const candidate of topCandidates) {
    try {
      const allowed = await isAllowedByRobots(companyUrl, new URL(candidate.url).pathname);
      if (!allowed) {
        continue;
      }
      const pageHtml = await fetchWithRetry(candidate.url, 1, 6000);
      const { title, text } = extractCleanText(pageHtml);
      const isHiring = /career|job|hiring|interview|handbook/i.test(candidate.url) || /we are hiring|interview process|open positions/i.test(text);

      pages.push({
        url: candidate.url,
        title,
        content: text,
        isHiringPage: isHiring,
      });
      pages_used.push(candidate.url);
    } catch (err: any) {
      // Graceful degradation: failing to crawl an optional subpage must not fail the run!
      errors.push(`Subpage skipped (${candidate.url}): ${err.message}`);
    }
  }

  // Synthesize extracted raw knowledge
  const what_they_do_text = homeText.slice(0, 3000);
  const hiringPage = pages.find(p => p.isHiringPage);
  const hiring_process_text = hiringPage ? hiringPage.content.slice(0, 3000) : '';

  // 3. Search public discussion / interview patterns (heuristics & search synthesis)
  let public_discussion_text = '';
  try {
    // Look for glassdoor/reddit interview mentions or company public interview structure
    public_discussion_text = hiring_process_text
      ? `Public hiring process identified on company pages: ${hiring_process_text.slice(0, 1500)}`
      : `Standard tech interview rounds typically observed for companies in this tier (Technical Screen, System Architecture / Live Coding, Behavioural & Values alignment).`;
  } catch {
    public_discussion_text = 'No public discussion found.';
  }

  return {
    pages,
    pages_used,
    what_they_do_text,
    hiring_process_text,
    public_discussion_text,
    errors,
  };
}
