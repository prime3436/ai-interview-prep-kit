import { Question, Requirement, Schedule, ScheduleDay } from './types.js';

/**
 * Deterministic Arithmetic Scheduler (Section 8)
 *
 * Distributes questions across exactly `daysAvailable` days:
 * 1. Harder (difficulty 3) and high-priority must-haves land EARLIER.
 * 2. Every must-have requirement is guaranteed to appear in the schedule.
 * 3. Schedule days count strictly matches daysAvailable.
 * 4. Durations are integer minutes (no floats).
 * 5. Handles edge cases: 1-day sprint up to 60-day spaced prep.
 */
export function allocateSchedule(
  daysAvailable: number,
  questions: Question[],
  requirements: Requirement[]
): Schedule {
  const daysCount = Math.max(1, Math.floor(daysAvailable));

  if (questions.length === 0) {
    // Empty edge case
    const days: ScheduleDay[] = [];
    for (let d = 1; d <= daysCount; d++) {
      days.push({
        day: d,
        focus: d === daysCount ? 'Final Interview Polish' : 'General Preparation',
        question_ids: [],
        minutes: 45,
      });
    }
    return { days_available: daysCount, days };
  }

  // 1. Identify which questions cover must-have requirements
  const mustReqIdSet = new Set(requirements.filter(r => r.priority === 'must').map(r => r.id));

  // Score questions for early placement:
  // Higher score = lands earlier in schedule
  function getQuestionPriorityScore(q: Question): number {
    let score = 0;
    // Difficulty weight: 3 -> +30, 2 -> +20, 1 -> +10
    score += q.difficulty * 10;

    // Must-have requirement weight: +40
    const coversMust = q.requirement_ids.some(rid => mustReqIdSet.has(rid));
    if (coversMust) score += 40;

    // Category weighting: system-design & technical front-loaded, behavioural mid, company-fit late
    if (q.category === 'system-design') score += 15;
    if (q.category === 'technical') score += 10;
    if (q.category === 'behavioural') score += 5;
    if (q.category === 'company-fit') score += 0;

    return score;
  }

  // Sort descending by priority score
  const sortedQuestions = [...questions].sort((a, b) => {
    return getQuestionPriorityScore(b) - getQuestionPriorityScore(a);
  });

  // Track which must-haves have been allocated
  const allocatedMustReqs = new Set<string>();

  // 2. Partitioning logic based on day count
  const days: ScheduleDay[] = [];

  if (daysCount === 1) {
    // Edge case: 1-day sprint
    // Include all questions, or at least all must-have questions
    const qIds = sortedQuestions.map(q => q.id);
    const totalMinutes = Math.min(180, Math.max(45, qIds.length * 15));

    days.push({
      day: 1,
      focus: 'Intensive Full-Spectrum Preparation Sprint',
      question_ids: qIds,
      minutes: Math.round(totalMinutes),
    });

    return { days_available: 1, days };
  }

  // When daysCount > 1:
  // We distribute sorted questions into bins.
  // Harder/higher-priority questions are in the earlier half of sortedQuestions.
  const dayQuestionBins: string[][] = Array.from({ length: daysCount }, () => []);

  if (daysCount <= sortedQuestions.length) {
    // More questions than days: allocate evenly across days
    sortedQuestions.forEach((q, idx) => {
      // Linear mapping to assign earlier questions to earlier days
      const targetDay = Math.min(daysCount - 1, Math.floor((idx / sortedQuestions.length) * daysCount));
      dayQuestionBins[targetDay].push(q.id);
      q.requirement_ids.forEach(rid => {
        if (mustReqIdSet.has(rid)) allocatedMustReqs.add(rid);
      });
    });
  } else {
    // More days than questions (e.g. 14, 30, or 60 days):
    // Days 1..N introduce initial material.
    // Subsequent days provide progressive spaced reviews and deep drills.
    sortedQuestions.forEach((q, idx) => {
      dayQuestionBins[idx].push(q.id);
      q.requirement_ids.forEach(rid => {
        if (mustReqIdSet.has(rid)) allocatedMustReqs.add(rid);
      });
    });

    // For the remaining days, perform spaced repetition cycles
    for (let d = sortedQuestions.length; d < daysCount; d++) {
      // Pick a subset of questions to review on this day
      const reviewIdx = d % sortedQuestions.length;
      const reviewQ = sortedQuestions[reviewIdx];
      dayQuestionBins[d].push(reviewQ.id);

      // Add a second question for reinforcement if available
      const secondIdx = (reviewIdx + 1) % sortedQuestions.length;
      if (secondIdx !== reviewIdx) {
        dayQuestionBins[d].push(sortedQuestions[secondIdx].id);
      }
    }
  }

  // 3. Guarantee: Every must-have requirement MUST appear in the schedule
  for (const mustReqId of mustReqIdSet) {
    if (!allocatedMustReqs.has(mustReqId)) {
      // Find a question that covers this must-have
      const matchingQ = sortedQuestions.find(q => q.requirement_ids.includes(mustReqId));
      if (matchingQ) {
        // Place in Day 1 or Day 2 (early)
        const targetDay = Math.min(1, daysCount - 1);
        if (!dayQuestionBins[targetDay].includes(matchingQ.id)) {
          dayQuestionBins[targetDay].unshift(matchingQ.id);
        }
        allocatedMustReqs.add(mustReqId);
      }
    }
  }

  // 4. Ensure no day is left empty (if questions exist)
  for (let d = 0; d < daysCount; d++) {
    if (dayQuestionBins[d].length === 0) {
      // Borrow or review the most relevant question for this phase
      const fallbackQ = sortedQuestions[d % sortedQuestions.length];
      dayQuestionBins[d].push(fallbackQ.id);
    }
  }

  // 5. Generate thematic focus and compute integer minutes for each day
  for (let d = 0; d < daysCount; d++) {
    const dayNumber = d + 1;
    const qIds = dayQuestionBins[d];
    const dayQuestions = qIds.map(id => questions.find(q => q.id === id)).filter(Boolean) as Question[];

    // Calculate integer minutes: 12-20 mins per question based on difficulty
    let calcMinutes = 0;
    for (const q of dayQuestions) {
      if (q.difficulty === 3) calcMinutes += 25;
      else if (q.difficulty === 2) calcMinutes += 15;
      else calcMinutes += 10;
    }
    // Clamp to realistic daily study intervals (30 to 90 mins)
    const minutes = Math.max(30, Math.min(120, Math.round(calcMinutes)));

    // Day focus title based on progress through the schedule
    let focus = '';
    const progressRatio = d / (daysCount - 1 || 1);

    const categoriesInDay = new Set(dayQuestions.map(q => q.category));

    if (progressRatio === 0) {
      focus = 'Core Architecture & High-Priority Technical Foundations';
    } else if (progressRatio < 0.4) {
      focus = categoriesInDay.has('system-design')
        ? 'System Design, Scalability & Deep Technical Scenarios'
        : 'Advanced Problem Solving & Technical Implementation';
    } else if (progressRatio < 0.75) {
      focus = categoriesInDay.has('behavioural')
        ? 'Behavioural Leadership, Conflict & Ownership Scenarios'
        : 'Integration, Reliability & Edge Case Deep Dive';
    } else if (d === daysCount - 1) {
      focus = 'Company Alignment, Culture Values & Final Mock Review';
    } else {
      focus = 'Consolidation, Weak Spots Review & Active Recall';
    }

    days.push({
      day: dayNumber,
      focus,
      question_ids: qIds,
      minutes,
    });
  }

  return {
    days_available: daysCount,
    days,
  };
}
