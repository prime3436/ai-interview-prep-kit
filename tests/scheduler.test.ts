import { describe, it, expect } from 'vitest';
import { allocateSchedule } from '../core/scheduler.js';
import { Question, Requirement } from '../core/types.js';

describe('Deterministic Arithmetic Scheduler (Section 8)', () => {
  const sampleRequirements: Requirement[] = [
    { id: 'r1', text: '5+ years Node.js', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Microservices architecture', kind: 'technical', priority: 'must' },
    { id: 'r3', text: 'Mentoring junior developers', kind: 'behavioural', priority: 'must' },
    { id: 'r4', text: 'Kubernetes experience', kind: 'technical', priority: 'nice' },
  ];

  const sampleQuestions: Question[] = [
    {
      id: 'q1',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'Explain Node.js event loop lag under heavy CPU loads.',
      answer_outline: '1. Single thread model\n2. Worker threads',
      difficulty: 2,
    },
    {
      id: 'q2',
      requirement_ids: ['r2'],
      category: 'system-design',
      prompt: 'Design a distributed rate limiter.',
      answer_outline: '1. Redis token bucket\n2. Failure isolation',
      difficulty: 3,
    },
    {
      id: 'q3',
      requirement_ids: ['r3'],
      category: 'behavioural',
      prompt: 'Tell me about coaching an underperforming junior engineer.',
      answer_outline: '1. Empathy\n2. 1-on-1 plan\n3. Outcome',
      difficulty: 2,
    },
    {
      id: 'q4',
      requirement_ids: ['r4'],
      category: 'technical',
      prompt: 'How do you configure Kubernetes liveness and readiness probes?',
      answer_outline: '1. Health endpoints\n2. Restart policies',
      difficulty: 1,
    },
    {
      id: 'q5',
      requirement_ids: ['r1', 'r2'],
      category: 'technical',
      prompt: 'How to handle distributed tracing across microservices?',
      answer_outline: '1. OpenTelemetry\n2. Trace context propagation',
      difficulty: 3,
    },
  ];

  it('allocates exactly the requested number of days (5 days)', () => {
    const schedule = allocateSchedule(5, sampleQuestions, sampleRequirements);
    expect(schedule.days_available).toBe(5);
    expect(schedule.days.length).toBe(5);
  });

  it('handles 1-day sprint edge case correctly', () => {
    const schedule = allocateSchedule(1, sampleQuestions, sampleRequirements);
    expect(schedule.days_available).toBe(1);
    expect(schedule.days.length).toBe(1);
    expect(schedule.days[0].question_ids.length).toBeGreaterThan(0);
    expect(Number.isInteger(schedule.days[0].minutes)).toBe(true);
  });

  it('handles 60-day schedule without leaving days empty', () => {
    const schedule = allocateSchedule(60, sampleQuestions, sampleRequirements);
    expect(schedule.days_available).toBe(60);
    expect(schedule.days.length).toBe(60);
    for (const day of schedule.days) {
      expect(day.question_ids.length).toBeGreaterThan(0);
      expect(Number.isInteger(day.minutes)).toBe(true);
    }
  });

  it('guarantees that every must-have requirement appears somewhere in the schedule', () => {
    const schedule = allocateSchedule(4, sampleQuestions, sampleRequirements);
    const scheduledQIds = new Set<string>();
    for (const d of schedule.days) {
      d.question_ids.forEach(qid => scheduledQIds.add(qid));
    }

    const coveredMustReqs = new Set<string>();
    for (const qid of scheduledQIds) {
      const q = sampleQuestions.find(sq => sq.id === qid);
      q?.requirement_ids.forEach(rid => coveredMustReqs.add(rid));
    }

    const mustReqs = sampleRequirements.filter(r => r.priority === 'must');
    for (const mustReq of mustReqs) {
      expect(coveredMustReqs.has(mustReq.id)).toBe(true);
    }
  });

  it('front-loads harder (difficulty 3) questions earlier rather than on the final day', () => {
    const schedule = allocateSchedule(5, sampleQuestions, sampleRequirements);
    const day1QIds = schedule.days[0].question_ids;
    const lastDayQIds = schedule.days[schedule.days.length - 1].question_ids;

    const day1Questions = day1QIds.map(id => sampleQuestions.find(q => q.id === id)!);
    const lastDayQuestions = lastDayQIds.map(id => sampleQuestions.find(q => q.id === id)!);

    const day1AvgDiff = day1Questions.reduce((acc, q) => acc + q.difficulty, 0) / day1Questions.length;
    const lastDayAvgDiff = lastDayQuestions.reduce((acc, q) => acc + q.difficulty, 0) / lastDayQuestions.length;

    expect(day1AvgDiff).toBeGreaterThanOrEqual(lastDayAvgDiff);
  });

  it('ensures all durations are integer minutes (no floats)', () => {
    const schedule = allocateSchedule(3, sampleQuestions, sampleRequirements);
    for (const day of schedule.days) {
      expect(Number.isInteger(day.minutes)).toBe(true);
      expect(day.minutes).toBeGreaterThanOrEqual(30);
    }
  });

  it('maintains referential integrity (all schedule question_ids exist in the kit)', () => {
    const schedule = allocateSchedule(4, sampleQuestions, sampleRequirements);
    const validIds = new Set(sampleQuestions.map(q => q.id));
    for (const day of schedule.days) {
      for (const qid of day.question_ids) {
        expect(validIds.has(qid)).toBe(true);
      }
    }
  });
});
