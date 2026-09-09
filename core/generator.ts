import { LLMClient, defaultLLM } from './llm.js';
import {
  Requirement,
  Question,
  Flashcard,
  CompanyBrief,
  QuestionCategory,
} from './types.js';

export interface GenerationContext {
  companyName: string;
  whatTheyDo: string;
  hiringProcess: string;
  publicDiscussion: string;
  sources: string[];
}

/**
 * Generate the Company Brief based on crawled data
 */
export async function generateCompanyBrief(
  companyName: string,
  crawledWhatTheyDo: string,
  crawledSources: string[],
  llm: LLMClient = defaultLLM
): Promise<CompanyBrief> {
  const fallback = (): CompanyBrief => ({
    summary: crawledWhatTheyDo
      ? `${companyName} focuses on building software and digital services. ${crawledWhatTheyDo.slice(0, 150)}`
      : `${companyName} is a technology company. Additional public information could not be retrieved.`,
    what_they_do: crawledWhatTheyDo
      ? crawledWhatTheyDo.slice(0, 400)
      : `Develops products and services in the digital sector.`,
    sources: crawledSources.length > 0 ? crawledSources : ['https://company.local'],
  });

  if (!crawledWhatTheyDo || crawledWhatTheyDo.length < 50) {
    return fallback();
  }

  const prompt = `You are a business intelligence researcher. Summarize the following information about the company "${companyName}".
Return strictly a JSON object with this exact shape:
{
  "summary": "2-3 sentence executive summary of what the company does and its market focus",
  "what_they_do": "Clear description of their primary products, platform, or services",
  "sources": ["${crawledSources.join('", "')}"]
}

CRAWLED WEBSITE TEXT:
"""
${crawledWhatTheyDo.slice(0, 4000)}
"""`;

  try {
    const brief = await llm.generateJSON<CompanyBrief>(prompt, fallback, {
      temperature: 0.2,
      systemInstruction: 'Output strict JSON only conforming to the schema.',
    });
    brief.sources = crawledSources.length > 0 ? crawledSources : brief.sources || [];
    return brief;
  } catch {
    return fallback();
  }
}

/**
 * Rule-based fallback question generator for a requirement
 */
function createFallbackQuestion(
  req: Requirement,
  category: QuestionCategory,
  id: string,
  context?: GenerationContext
): Question {
  let prompt = '';
  let answer_outline = '';
  let difficulty: 1 | 2 | 3 = 2;

  if (category === 'technical') {
    prompt = `How have you applied ${req.text} in production, and what were the most significant trade-offs or challenges you faced?`;
    answer_outline = `1. Clear architectural context and scale.\n2. Concrete technical choices and rationale.\n3. Handling edge cases, performance bottlenecks, or failure modes.\n4. Retrospective lessons learned.`;
    difficulty = 2;
  } else if (category === 'behavioural') {
    prompt = `Tell me about a time when you had to demonstrate: "${req.text}". How did you handle conflicts, priorities, and stakeholder expectations?`;
    answer_outline = `1. Situation: Context and team structure.\n2. Task: The specific goal and obstacles.\n3. Action: Personal leadership, communication, and mitigation steps.\n4. Result: Quantitative and qualitative outcome.`;
    difficulty = 2;
  } else if (category === 'system-design') {
    prompt = `Design a scalable service or component that fulfills: "${req.text}". Walk through the data models, APIs, and scaling strategy.`;
    answer_outline = `1. Functional and non-functional requirements.\n2. High-level architecture and API contracts.\n3. Data persistence, partitioning, and caching.\n4. Failure scenarios, rate limits, and monitoring.`;
    difficulty = 3;
  } else {
    // company-fit
    const company = context?.companyName || 'our company';
    prompt = `How does your background in "${req.text}" align with ${company}'s mission and engineering culture?`;
    answer_outline = `1. Understanding of company problem domain.\n2. Demonstration of engineering values (ownership, velocity, pragmatism).\n3. Genuine motivation for this role.`;
    difficulty = 1;
  }

  return {
    id,
    requirement_ids: [req.id],
    category,
    prompt,
    answer_outline,
    difficulty,
    _origin: 'generated',
    _isPinned: false,
  };
}

/**
 * Generate questions for a specific category and set of requirements
 */
export async function generateCategoryQuestions(
  category: QuestionCategory,
  requirements: Requirement[],
  context: GenerationContext,
  startIdNumber: number,
  llm: LLMClient = defaultLLM
): Promise<Question[]> {
  if (requirements.length === 0) return [];

  const fallback = (): Question[] => {
    return requirements.map((req, idx) =>
      createFallbackQuestion(req, category, `q${startIdNumber + idx}`, context)
    );
  };

  const categoryInstructions = {
    technical: `Focus on hands-on technical depth, language/framework semantics, concurrency, memory management, testing, and debugging related to the specified requirements.`,
    behavioural: `Focus on STAR method situations: collaboration, conflict resolution, mentoring, ambiguity, and technical ownership relating to the specified requirements.`,
    'system-design': `Focus on system architecture, data flow, API design, scalability, trade-offs, and resilience related to the requirements.`,
    'company-fit': `Focus on alignment with ${context.companyName}'s product, domain, engineering standards, and the discovered hiring process: "${context.hiringProcess.slice(0, 300)}".`,
  };

  const reqListStr = requirements.map(r => `[ID: ${r.id}] (Priority: ${r.priority}, Kind: ${r.kind}) ${r.text}`).join('\n');

  const prompt = `You are a Principal Engineering Interviewer.
Generate high-caliber interview questions in the category: "${category}".

CATEGORY OBJECTIVE:
${categoryInstructions[category]}

COMPANY CONTEXT:
Company: ${context.companyName}
What they do: ${context.whatTheyDo.slice(0, 500)}
Hiring Process Insights: ${context.hiringProcess ? context.hiringProcess.slice(0, 500) : 'Standard engineering stages'}

REQUIREMENTS TO TARGET:
${reqListStr}

CRITICAL RULES:
1. Every generated question MUST include "requirement_ids" linking to at least one valid [ID: ...] from the list above.
2. Every question must have an integer "difficulty": 1 (foundational), 2 (standard production scenario), or 3 (deep trade-offs / complex architecture).
3. "answer_outline" must give structured talking points that an interviewer looks for.
4. "id" should start from "q${startIdNumber}", "q${startIdNumber + 1}", etc.

OUTPUT FORMAT:
Return strictly a JSON array of objects:
[
  {
    "id": "q${startIdNumber}",
    "requirement_ids": ["${requirements[0].id}"],
    "category": "${category}",
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
        id: `q${startIdNumber + idx}`,
        requirement_ids: Array.isArray(q.requirement_ids) && q.requirement_ids.length > 0
          ? q.requirement_ids.filter(rid => requirements.some(r => r.id === rid))
          : [requirements[Math.min(idx, requirements.length - 1)].id],
        category,
        prompt: q.prompt || `Explain your experience with ${requirements[0].text}`,
        answer_outline: q.answer_outline || '1. Technical context\n2. Implementation details\n3. Trade-offs',
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
 * Generate Flashcards covering the requirements
 */
export async function generateFlashcards(
  requirements: Requirement[],
  context: GenerationContext,
  llm: LLMClient = defaultLLM
): Promise<Flashcard[]> {
  const fallback = (): Flashcard[] => {
    return requirements.slice(0, 10).map((req, idx) => ({
      id: `f${idx + 1}`,
      front: `Core concept: ${req.text}`,
      back: `Key principles: In-depth understanding of ${req.text}, production best practices, and avoiding common pitfalls.`,
      requirement_ids: [req.id],
      _origin: 'generated',
      _isPinned: false,
    }));
  };

  if (requirements.length === 0) return [];

  const reqListStr = requirements.map(r => `[ID: ${r.id}] ${r.text}`).join('\n');

  const prompt = `You are an expert technical study coach.
Generate quick-fire interview flashcards for active recall study.

REQUIREMENTS:
${reqListStr}

CRITICAL RULES:
1. Each card has "front" (a direct technical question, concept definition, or scenario) and "back" (a crisp, memorable bulleted answer).
2. "requirement_ids" must link to the corresponding requirement ID(s).
3. "id" must be formatted as "f1", "f2", "f3", etc.

OUTPUT FORMAT:
Return strictly a JSON array:
[
  {
    "id": "f1",
    "front": "What is the primary difference between...",
    "back": "Key distinction:\n• Point 1\n• Point 2",
    "requirement_ids": ["${requirements[0].id}"]
  }
]`;

  try {
    const cards = await llm.generateJSON<Flashcard[]>(prompt, fallback, {
      temperature: 0.2,
      systemInstruction: 'Output strict JSON array only.',
    });

    if (Array.isArray(cards) && cards.length > 0) {
      return cards.map((c, idx) => ({
        id: `f${idx + 1}`,
        front: c.front || `Core concept for ${requirements[0].text}`,
        back: c.back || `Definition and key trade-offs.`,
        requirement_ids: Array.isArray(c.requirement_ids) && c.requirement_ids.length > 0
          ? c.requirement_ids.filter(rid => requirements.some(r => r.id === rid))
          : [requirements[Math.min(idx, requirements.length - 1)].id],
        _origin: 'generated' as const,
        _isPinned: false,
      }));
    }

    return fallback();
  } catch {
    return fallback();
  }
}
