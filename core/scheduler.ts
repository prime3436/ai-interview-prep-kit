import { Question, Requirement, Schedule, ScheduleDay } from './types.js';

export function allocateSchedule(
  daysAvailable: number,
  questions: Question[],
  requirements: Requirement[]
): Schedule {
  const daysCount = Math.max(1, Math.floor(daysAvailable));

  if (questions.length === 0) {

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

  const mustReqIdSet = new Set(requirements.filter(r => r.priority === 'must').map(r => r.id));

  function getQuestionPriorityScore(q: Question): number {
    let score = 0;

    score += q.difficulty * 10;

    const coversMust = q.requirement_ids.some(rid => mustReqIdSet.has(rid));
    if (coversMust) score += 40;

    if (q.category === 'system-design') score += 15;
    if (q.category === 'technical') score += 10;
    if (q.category === 'behavioural') score += 5;
    if (q.category === 'company-fit') score += 0;

    return score;
  }

  const sortedQuestions = [...questions].sort((a, b) => {
    return getQuestionPriorityScore(b) - getQuestionPriorityScore(a);
  });

  const allocatedMustReqs = new Set<string>();

  const days: ScheduleDay[] = [];

  if (daysCount === 1) {

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

  const dayQuestionBins: string[][] = Array.from({ length: daysCount }, () => []);

  if (daysCount <= sortedQuestions.length) {

    sortedQuestions.forEach((q, idx) => {

      const targetDay = Math.min(daysCount - 1, Math.floor((idx / sortedQuestions.length) * daysCount));
      dayQuestionBins[targetDay].push(q.id);
      q.requirement_ids.forEach(rid => {
        if (mustReqIdSet.has(rid)) allocatedMustReqs.add(rid);
      });
    });
  } else {

    sortedQuestions.forEach((q, idx) => {
      dayQuestionBins[idx].push(q.id);
      q.requirement_ids.forEach(rid => {
        if (mustReqIdSet.has(rid)) allocatedMustReqs.add(rid);
      });
    });

    for (let d = sortedQuestions.length; d < daysCount; d++) {

      const reviewIdx = d % sortedQuestions.length;
      const reviewQ = sortedQuestions[reviewIdx];
      dayQuestionBins[d].push(reviewQ.id);

      const secondIdx = (reviewIdx + 1) % sortedQuestions.length;
      if (secondIdx !== reviewIdx) {
        dayQuestionBins[d].push(sortedQuestions[secondIdx].id);
      }
    }
  }

  for (const mustReqId of mustReqIdSet) {
    if (!allocatedMustReqs.has(mustReqId)) {

      const matchingQ = sortedQuestions.find(q => q.requirement_ids.includes(mustReqId));
      if (matchingQ) {

        const targetDay = Math.min(1, daysCount - 1);
        if (!dayQuestionBins[targetDay].includes(matchingQ.id)) {
          dayQuestionBins[targetDay].unshift(matchingQ.id);
        }
        allocatedMustReqs.add(mustReqId);
      }
    }
  }

  for (let d = 0; d < daysCount; d++) {
    if (dayQuestionBins[d].length === 0) {

      const fallbackQ = sortedQuestions[d % sortedQuestions.length];
      dayQuestionBins[d].push(fallbackQ.id);
    }
  }

  for (let d = 0; d < daysCount; d++) {
    const dayNumber = d + 1;
    const qIds = dayQuestionBins[d];
    const dayQuestions = qIds.map(id => questions.find(q => q.id === id)).filter(Boolean) as Question[];

    let calcMinutes = 0;
    for (const q of dayQuestions) {
      if (q.difficulty === 3) calcMinutes += 25;
      else if (q.difficulty === 2) calcMinutes += 15;
      else calcMinutes += 10;
    }

    const minutes = Math.max(30, Math.min(120, Math.round(calcMinutes)));

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

