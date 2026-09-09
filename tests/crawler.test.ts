import { describe, it, expect } from 'vitest';
import { isSafeUrl, rankLink, extractCleanText } from '../core/crawler.js';

describe('Intelligent Crawler & Security (Sections 2 & 11)', () => {
  it('identifies safe external URLs', () => {
    expect(isSafeUrl('https://stripe.com').safe).toBe(true);
    expect(isSafeUrl('https://example.com/careers').safe).toBe(true);
  });

  it('allows local URLs when explicitly permitted (e.g. test harness)', () => {
    expect(isSafeUrl('http://localhost:8099/acme/', true).safe).toBe(true);
  });

  it('ranks hiring and careers links higher than generic links', () => {
    const hiringScore = rankLink('https://company.com/careers/engineering', 'Open Engineering Roles');
    const jobsScore = rankLink('https://company.com/jobs', 'Jobs');
    const termsScore = rankLink('https://company.com/terms-of-service', 'Terms');

    expect(hiringScore).toBeGreaterThan(termsScore);
    expect(jobsScore).toBeGreaterThan(termsScore);
    expect(hiringScore).toBeGreaterThanOrEqual(15);
  });

  it('extracts clean text and strips scripts and navigation tags', () => {
    const rawHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Acme Cloud Services</title></head>
        <body>
          <nav><a href="/login">Login</a></nav>
          <script>console.log("tracking code");</script>
          <main>
            <h1>Building the Future of Infrastructure</h1>
            <p>We provide distributed database solutions to millions of developers worldwide.</p>
            <a href="/careers">Join our team</a>
          </main>
          <footer>Copyright 2026 Acme</footer>
        </body>
      </html>
    `;

    const { title, text, links } = extractCleanText(rawHtml);
    expect(title).toBe('Acme Cloud Services');
    expect(text).toContain('Building the Future of Infrastructure');
    expect(text).toContain('distributed database solutions');
    expect(text).not.toContain('console.log');
    expect(text).not.toContain('Copyright 2026');
    expect(links.some(l => l.href === '/careers')).toBe(true);
  });
});
