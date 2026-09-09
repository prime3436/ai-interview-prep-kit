import { describe, it, expect } from 'vitest';
import { validateKit, validateBatchInput } from '../core/validator.js';
import { Kit } from '../core/types.js';

describe('Appendix A & B Structure Validation (Section 5 & 9)', () => {
  const validKit: Kit = {
    source: {
      company: 'Stripe',
      company_url: 'https://stripe.com',
      role: 'Staff Backend Engineer',
      location: 'Remote',
      jd_chars: 1200,
      researched_at: '2026-09-09T08:00:00Z',
      pages_used: ['https://stripe.com', 'https://stripe.com/jobs'],
    },
    company_brief: {
      summary: 'Financial infrastructure for the internet.',
      what_they_do: 'Payments APIs, billing, and fraud prevention.',
      sources: ['https://stripe.com'],
    },
    role: {
      title: 'Staff Backend Engineer',
      seniority: 'Staff',
      responsibilities: ['Architect high-throughput payment systems', 'Guide engineering best practices'],
      requirements: [
        { id: 'r1', text: '5+ years distributed systems', kind: 'technical', priority: 'must' },
        { id: 'r2', text: 'Leadership and mentoring', kind: 'behavioural', priority: 'must' },
      ],
    },
    questions: [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'How do you design idempotent payment webhook listeners?',
        answer_outline: '1. Deduplication table\n2. Distributed lock',
        difficulty: 2,
      },
      {
        id: 'q2',
        requirement_ids: ['r2'],
        category: 'behavioural',
        prompt: 'Describe how you drove alignment across disagreeing teams.',
        answer_outline: '1. Written proposals\n2. Open discussion',
        difficulty: 2,
      },
    ],
    flashcards: [
      {
        id: 'f1',
        front: 'What is idempotency in payments?',
        back: 'The property where multiple identical requests have the same effect as a single request.',
        requirement_ids: ['r1'],
      },
    ],
    schedule: {
      days_available: 2,
      days: [
        { day: 1, focus: 'Distributed Systems & Reliability', question_ids: ['q1'], minutes: 45 },
        { day: 2, focus: 'Leadership & Alignment', question_ids: ['q2'], minutes: 45 },
      ],
    },
    coverage: {
      uncovered_requirement_ids: [],
      passes: 1,
    },
  };

  it('validates a conformant Appendix A kit with no errors', () => {
    const result = validateKit(validKit);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects invalid difficulty (e.g. difficulty 4 or 0)', () => {
    const invalidKit = JSON.parse(JSON.stringify(validKit));
    invalidKit.questions[0].difficulty = 4;
    const result = validateKit(invalidKit);
    expect(result.valid).toBe(false);
  });

  it('detects referential integrity violation in schedule question_ids', () => {
    const brokenKit = JSON.parse(JSON.stringify(validKit));
    brokenKit.schedule.days[0].question_ids = ['q999']; // q999 does not exist
    const result = validateKit(brokenKit);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('unknown question_id "q999"'))).toBe(true);
  });

  it('detects mismatch between schedule days count and days_available', () => {
    const brokenKit = JSON.parse(JSON.stringify(validKit));
    brokenKit.schedule.days_available = 5; // but days array has only 2 items
    const result = validateKit(brokenKit);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('does not match days_available'))).toBe(true);
  });

  it('validates Appendix B batch input structure correctly', () => {
    const validBatchInput = [
      {
        id: 'case-01',
        jd: 'Senior Go Engineer...',
        company_url: 'https://docker.com',
        days: 5,
      },
    ];

    const result = validateBatchInput(validBatchInput);
    expect(result.valid).toBe(true);
    expect(result.cases).toHaveLength(1);
  });
});
