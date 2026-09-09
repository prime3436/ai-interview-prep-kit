import { describe, it, expect } from 'vitest';
import { extractRequirementsRuleBased } from '../core/extractor.js';

describe('Job Description Requirement Extractor (Section 3 & 10)', () => {
  it('correctly preserves leading numbers like 5+ years', () => {
    const jd = `Senior Backend Engineer
Requirements:
- 5+ years of experience with Node.js and TypeScript
- Proven experience designing and operating microservices in production
- Bonus: 3+ years with Kubernetes
- Mentoring junior engineers`;

    const role = extractRequirementsRuleBased(jd);
    expect(role.requirements.length).toBeGreaterThanOrEqual(3);

    const r1 = role.requirements.find(r => r.text.includes('Node.js'));
    expect(r1).toBeDefined();
    expect(r1?.text).toContain('5+ years');
    expect(r1?.priority).toBe('must');
    expect(r1?.kind).toBe('technical');

    const bonusReq = role.requirements.find(r => r.text.includes('Kubernetes'));
    expect(bonusReq).toBeDefined();
    expect(bonusReq?.priority).toBe('nice');

    const mentorReq = role.requirements.find(r => r.text.includes('Mentoring'));
    expect(mentorReq).toBeDefined();
    expect(mentorReq?.kind).toBe('behavioural');
  });

  it('handles thin two-line stub honestly without fabricating extra requirements', () => {
    const stubJd = 'Full Stack Engineer needed. Node.js and React. Remote.';
    const role = extractRequirementsRuleBased(stubJd);

    expect(role.requirements.length).toBeLessThanOrEqual(2);
    expect(role.requirements.every(r => r.id.startsWith('r'))).toBe(true);
  });
});
