import { describe, it, expect } from 'vitest';
import { checkRequirementCoverage, runCoveragePasses } from '../core/coverage.js';
import { Requirement, Question } from '../core/types.js';
import { GenerationContext } from '../core/generator.js';

describe('Deterministic Coverage Checker & Second Pass (Section 4)', () => {
  const requirements: Requirement[] = [
    { id: 'r1', text: '5+ years with React', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Mentoring junior developers', kind: 'behavioural', priority: 'must' },
    { id: 'r3', text: 'Next.js 14 App Router', kind: 'technical', priority: 'nice' },
    { id: 'r4', text: 'GraphQL schema design', kind: 'technical', priority: 'must' },
  ];

  it('correctly identifies uncovered requirements deterministically', () => {
    // Only r1 and r3 have questions
    const questions: Question[] = [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'React hooks internals',
        answer_outline: 'Fiber architecture',
        difficulty: 2,
      },
      {
        id: 'q2',
        requirement_ids: ['r3'],
        category: 'technical',
        prompt: 'Server components',
        answer_outline: 'Streaming SSR',
        difficulty: 2,
      },
    ];

    const analysis = checkRequirementCoverage(requirements, questions);

    expect(analysis.uncoveredIds).toContain('r2');
    expect(analysis.uncoveredIds).toContain('r4');
    expect(analysis.uncoveredMust.map(r => r.id)).toEqual(['r2', 'r4']);
    expect(analysis.uncoveredNice).toHaveLength(0);
  });

  it('executes second-pass to close must-have requirement gaps', async () => {
    // Initial draft misses r2 and r4
    const initialQuestions: Question[] = [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'React rendering lifecycle',
        answer_outline: 'Virtual DOM diffing',
        difficulty: 2,
      },
      {
        id: 'q2',
        requirement_ids: ['r3'],
        category: 'technical',
        prompt: 'Next.js App router',
        answer_outline: 'Layouts and server components',
        difficulty: 2,
      },
    ];

    const mockContext: GenerationContext = {
      companyName: 'Acme Inc',
      whatTheyDo: 'Cloud dev tools',
      hiringProcess: 'Take-home followed by system design',
      publicDiscussion: '',
      sources: ['https://acme.inc'],
    };

    const { questions: finalQuestions, coverage } = await runCoveragePasses(
      requirements,
      initialQuestions,
      mockContext,
      2
    );

    // Pass count must be recorded as 2 because a second pass was needed
    expect(coverage.passes).toBe(2);

    // Verify all must-have requirements now have corresponding questions
    const finalCoveredReqIds = new Set<string>();
    finalQuestions.forEach(q => q.requirement_ids.forEach(rid => finalCoveredReqIds.add(rid)));

    expect(finalCoveredReqIds.has('r1')).toBe(true);
    expect(finalCoveredReqIds.has('r2')).toBe(true);
    expect(finalCoveredReqIds.has('r4')).toBe(true);
  });

  it('does not run unnecessary second pass if all requirements are covered in pass 1', async () => {
    const fullQuestions: Question[] = [
      { id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: '', answer_outline: '', difficulty: 2 },
      { id: 'q2', requirement_ids: ['r2'], category: 'behavioural', prompt: '', answer_outline: '', difficulty: 2 },
      { id: 'q3', requirement_ids: ['r3'], category: 'technical', prompt: '', answer_outline: '', difficulty: 1 },
      { id: 'q4', requirement_ids: ['r4'], category: 'technical', prompt: '', answer_outline: '', difficulty: 3 },
    ];

    const mockContext: GenerationContext = {
      companyName: 'Acme Inc',
      whatTheyDo: 'Cloud dev tools',
      hiringProcess: '',
      publicDiscussion: '',
      sources: [],
    };

    const { coverage } = await runCoveragePasses(requirements, fullQuestions, mockContext, 2);
    expect(coverage.passes).toBe(1);
    expect(coverage.uncovered_requirement_ids).toHaveLength(0);
  });
});
