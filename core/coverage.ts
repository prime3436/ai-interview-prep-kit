import { LLMClient, defaultLLM } from './llm.js';
import { Requirement, Question, CoverageInfo } from './types.js';
import { GenerationContext } from './generator.js';

export interface CoverageAnalysis {
  uncoveredMust: Requirement[];
  uncoveredNice: Requirement[];
  allUncovered: Requirement[];
  uncoveredIds: string[];
}

/**
 * Deterministic Coverage Check:
 * Pure code logic (NOT LLM) comparing requirements against question requirement_ids.
 */
export function checkRequirementCoverage(
  requirements: Requirement[],
  questions: Question[]
): CoverageAnalysis {
  const coveredReqIds = new Set<string>();

  for (const q of questions) {
    if (Array.isArray(q.requirement_ids)) {
      for (const rid of q.requirement_ids) {
        coveredReqIds.add(rid);
      }
    }
  }

  const uncoveredMust: Requirement[] = [];
  const uncoveredNice: Requirement[] = [];
  const allUncovered: Requirement[] = [];
  const uncoveredIds: string[] = [];

  for (const req of requirements) {
    if (!coveredReqIds.has(req.id)) {
      allUncovered.push(req);
      uncoveredIds.push(req.id);
      if (req.priority === 'must') {
        uncoveredMust.push(req);
      } else {
        uncoveredNice.push(req);
      }
    }
  }

  return {
    uncoveredMust,
    uncoveredNice,
    allUncovered,
    uncoveredIds,
  };
}

/**
 * Executes targeted generation for uncovered requirements (Pass 2)
 */
async function generateGapQuestions(
  gaps: Requirement[],
  context: GenerationContext,
  startId: number,
  llm: LLMClient = defaultLLM
): Promise<Question[]> {
  const fallback = (): Question[] => {
    return gaps.map((req, idx) => {
      const category = req.kind === 'behavioural' ? 'behavioural' : 'technical';
      return {
        id: `q${startId + idx}`,
        requirement_ids: [req.id],
        category,
        prompt: `Deep dive: How have you demonstrated proficiency in "${req.text}" in prior roles?`,
        answer_outline: `1. Direct experience with ${req.text}.\n2. Architecture & best practices.\n3. Measurable impact.`,
        difficulty: req.priority === 'must' ? 2 : 1,
        _origin: 'generated',
        _isPinned: false,
      };
    });
  };

  const gapStr = gaps.map(g => `[ID: ${g.id}] (Priority: ${g.priority}, Kind: ${g.kind}) ${g.text}`).join('\n');

  const prompt = `You are an Interview Coverage Specialist.
The following requirements currently have ZERO questions generated for them in the candidate's prep kit.
Your objective is to generate targeted interview questions covering these specific missing requirements.

UNCOVERED REQUIREMENTS:
${gapStr}

COMPANY CONTEXT:
Company: ${context.companyName}
What they do: ${context.whatTheyDo.slice(0, 300)}

CRITICAL RULES:
1. Every question MUST target at least one uncovered requirement ID in "requirement_ids".
2. Category must be "technical", "behavioural", "system-design", or "company-fit".
3. Assign integer difficulty 1, 2, or 3.
4. "id" must start with "q${startId}", "q${startId + 1}", etc.

OUTPUT STRICT JSON ARRAY:
[
  {
    "id": "q${startId}",
    "requirement_ids": ["${gaps[0].id}"],
    "category": "${gaps[0].kind === 'behavioural' ? 'behavioural' : 'technical'}",
    "prompt": "Question text...",
    "answer_outline": "1. Key point... 2. Key point...",
    "difficulty": 2
  }
]`;

  try {
    const questions = await llm.generateJSON<Question[]>(prompt, fallback, {
      temperature: 0.2,
      systemInstruction: 'Output strict JSON array only.',
    });

    if (Array.isArray(questions) && questions.length > 0) {
      return questions.map((q, idx) => ({
        id: `q${startId + idx}`,
        requirement_ids: Array.isArray(q.requirement_ids) && q.requirement_ids.length > 0
          ? q.requirement_ids.filter(rid => gaps.some(g => g.id === rid))
          : [gaps[Math.min(idx, gaps.length - 1)].id],
        category: (['technical', 'behavioural', 'system-design', 'company-fit'].includes(q.category) ? q.category : 'technical') as any,
        prompt: q.prompt || `Explain your experience with ${gaps[0].text}`,
        answer_outline: q.answer_outline || '1. Key architectural points\n2. Implementation trade-offs',
        difficulty: ([1, 2, 3].includes(q.difficulty) ? q.difficulty : 2) as 1 | 2 | 3,
        _origin: 'generated' as const,
        _isPinned: false,
      }));
    }

    return fallback();
  } catch {
    return fallback();
  }
}

/**
 * Second-Pass Coverage Loop (Section 4):
 * Evaluates gaps deterministically. If must-have requirements are uncovered,
 * loops into Pass 2 to generate missing questions until all must-haves are covered.
 */
export async function runCoveragePasses(
  requirements: Requirement[],
  initialQuestions: Question[],
  context: GenerationContext,
  maxPasses = 2,
  llm: LLMClient = defaultLLM
): Promise<{ questions: Question[]; coverage: CoverageInfo }> {
  let questions = [...initialQuestions];
  let passes = 1;

  // Pass 1 deterministic check
  let analysis = checkRequirementCoverage(requirements, questions);

  // If there are uncovered requirements and we have passes remaining, run Pass 2
  if (analysis.allUncovered.length > 0 && passes < maxPasses) {
    passes++;
    const nextStartId = questions.length + 1;
    const gapQuestions = await generateGapQuestions(analysis.allUncovered, context, nextStartId, llm);
    questions = [...questions, ...gapQuestions];

    // Re-check coverage
    analysis = checkRequirementCoverage(requirements, questions);
  }

  // Safety guarantee: If any MUST requirement is STILL uncovered, synthesize deterministic question
  // to guarantee that no must-have requirement ships uncovered!
  if (analysis.uncoveredMust.length > 0) {
    for (const mustReq of analysis.uncoveredMust) {
      const fallbackQ: Question = {
        id: `q${questions.length + 1}`,
        requirement_ids: [mustReq.id],
        category: mustReq.kind === 'behavioural' ? 'behavioural' : 'technical',
        prompt: `How have you demonstrated mastery in ${mustReq.text}? Walk through a specific high-impact scenario.`,
        answer_outline: `1. Direct experience with ${mustReq.text}.\n2. Concrete technical choices.\n3. Handling obstacles.\n4. Production results.`,
        difficulty: 2,
        _origin: 'generated',
        _isPinned: false,
      };
      questions.push(fallbackQ);
    }
    // Re-evaluate coverage after fallback resolution
    analysis = checkRequirementCoverage(requirements, questions);
  }

  return {
    questions,
    coverage: {
      uncovered_requirement_ids: analysis.uncoveredIds,
      passes,
    },
  };
}
