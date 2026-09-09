import { LLMClient, defaultLLM } from './llm.js';
import { RoleInfo, Requirement, RequirementKind, RequirementPriority } from './types.js';

/**
 * Deterministic fallback requirement extractor (used for zero-hallucination guarantees and offline testing)
 */
export function extractRequirementsRuleBased(jdText: string): RoleInfo {
  const lines = jdText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  let title = 'Software Engineer';
  let seniority = 'Mid-Senior';
  const responsibilities: string[] = [];
  const requirements: Requirement[] = [];

  // Attempt to infer title from first line if it looks like a title
  if (lines.length > 0 && lines[0].length < 80 && !lines[0].includes('.')) {
    title = lines[0].replace(/^Job\s*(Title|Description)?:\s*/i, '').trim();
  }

  // Infer seniority
  const lowerJd = jdText.toLowerCase();
  if (lowerJd.includes('lead') || lowerJd.includes('staff') || lowerJd.includes('principal')) {
    seniority = 'Staff / Principal';
  } else if (lowerJd.includes('senior') || lowerJd.includes('sr.') || lowerJd.includes('5+ years') || lowerJd.includes('7+ years')) {
    seniority = 'Senior';
  } else if (lowerJd.includes('junior') || lowerJd.includes('entry') || lowerJd.includes('graduate') || lowerJd.includes('0-2 years')) {
    seniority = 'Junior / Entry';
  }

  let currentSection: 'unknown' | 'resp' | 'req' | 'bonus' = 'unknown';
  let reqCount = 0;

  for (const line of lines) {
    const clean = line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim();
    if (!clean) continue;

    // Detect standalone section headers
    if (/^(responsibilities|what you('ll| will) do|the role)[:\s]*$/i.test(clean)) {
      currentSection = 'resp';
      continue;
    }
    if (/^(requirements|qualifications|what you bring|must have|what we are looking for|who you are)[:\s]*$/i.test(clean)) {
      currentSection = 'req';
      continue;
    }
    if (/^(nice to have|bonus|bonus points|preferred|plus|optional)[:\s]*$/i.test(clean)) {
      currentSection = 'bonus';
      continue;
    }

    // Process bullet points or statements
    const isBullet = /^[-*•\d.)]/.test(line);

    if (currentSection === 'resp' && isBullet && responsibilities.length < 8) {
      responsibilities.push(clean);
    } else if ((currentSection === 'req' || currentSection === 'bonus' || isBullet) && clean.length > 10) {
      reqCount++;
      const id = `r${reqCount}`;
      const lower = clean.toLowerCase();

      // Priority: strictly determine must vs nice based on literal text
      let priority: RequirementPriority = currentSection === 'bonus' ? 'nice' : 'must';
      if (/bonus|plus|preferred|nice to have|helpful|optional/i.test(lower)) {
        priority = 'nice';
      } else if (/must|required|essential|minimum|proven experience|years of/i.test(lower)) {
        priority = 'must';
      }

      // Kind: technical | behavioural | domain
      let kind: RequirementKind = 'technical';
      if (/mentor|collaborat|communicat|cross-functional|lead|teamwork|ownership|agile|stakeholder|partner/i.test(lower)) {
        kind = 'behavioural';
      } else if (/fintech|health|crypto|domain|compliance|gdpr|banking|ecommerce|logistics|regulatory/i.test(lower)) {
        kind = 'domain';
      }

      requirements.push({
        id,
        text: clean,
        kind,
        priority,
      });
    }
  }

  // Handle thin 2-line stub: if no bullet items were parsed, extract the lines directly without fabricating
  if (requirements.length === 0) {
    lines.forEach((line, idx) => {
      const clean = line.trim();
      if (clean.length > 15) {
        reqCount++;
        requirements.push({
          id: `r${reqCount}`,
          text: clean,
          kind: /collaborat|team|lead|mentor/i.test(clean) ? 'behavioural' : 'technical',
          priority: 'must',
        });
      }
    });
  }

  // Ensure at least one must-have if any requirement exists
  if (requirements.length > 0 && !requirements.some(r => r.priority === 'must')) {
    requirements[0].priority = 'must';
  }

  return {
    title,
    seniority,
    responsibilities: responsibilities.length > 0 ? responsibilities : ['Execute core software engineering responsibilities outlined in the job posting.'],
    requirements,
  };
}

/**
 * Deliberate JD Extractor:
 * Uses LLM with strict, anti-hallucination instructions, falling back to rule-based parser.
 */
export async function extractRoleAndRequirements(
  jdText: string,
  llm: LLMClient = defaultLLM
): Promise<RoleInfo> {
  const fallback = () => extractRequirementsRuleBased(jdText);

  // If JD is ultra-thin (e.g. < 120 chars), use strict rule extraction to prevent model from inventing requirements
  if (jdText.trim().length < 120) {
    return fallback();
  }

  const prompt = `You are a strict, precise Technical Recruiter and Job Analyst.
Analyze the following Job Description (JD) text and extract the structured role information and requirements.

CRITICAL RULES:
1. DO NOT INVENT OR FABRICATE ANY REQUIREMENTS. Only extract requirements that are explicitly stated in the text.
2. If the JD is brief or thin, return ONLY the few items mentioned.
3. Every requirement must have:
   - "id": stable string, starting with "r1", "r2", "r3", etc.
   - "text": concise requirement description taken from the posting.
   - "kind": "technical" | "behavioural" | "domain"
   - "priority": "must" | "nice" (Mark as "must" if required, essential, minimum years specified. Mark as "nice" if bonus points, preferred, plus, or optional).
4. Extract title, seniority (e.g. Junior, Mid-Level, Senior, Staff, Lead), and core responsibilities (array of strings).

OUTPUT FORMAT:
Return strictly a JSON object matching this schema:
{
  "title": "Senior Backend Engineer",
  "seniority": "Senior",
  "responsibilities": ["Design microservices...", "..."],
  "requirements": [
    { "id": "r1", "text": "5+ years experience with Go or Node.js", "kind": "technical", "priority": "must" },
    { "id": "r2", "text": "Experience with Kubernetes is a plus", "kind": "technical", "priority": "nice" }
  ]
}

JOB DESCRIPTION TEXT:
"""
${jdText.slice(0, 15000)}
"""`;

  try {
    const extracted = await llm.generateJSON<RoleInfo>(prompt, fallback, {
      temperature: 0.1,
      systemInstruction: 'You are an exact extraction engine. Do not hallucinate. Output strict valid JSON only.',
    });

    // Ensure IDs are strictly formatted as r1, r2, ...
    if (extracted && Array.isArray(extracted.requirements)) {
      extracted.requirements = extracted.requirements.map((r, i) => ({
        id: `r${i + 1}`,
        text: r.text || `Requirement ${i + 1}`,
        kind: (['technical', 'behavioural', 'domain'].includes(r.kind) ? r.kind : 'technical') as RequirementKind,
        priority: (['must', 'nice'].includes(r.priority) ? r.priority : 'must') as RequirementPriority,
      }));
      return extracted;
    }

    return fallback();
  } catch {
    return fallback();
  }
}
