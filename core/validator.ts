import { z } from 'zod';
import { Kit, BatchOutputFile, BatchCaseInput } from './types.js';

/**
 * Zod schema strictly validating Appendix A Kit structure
 */
export const RequirementSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  kind: z.enum(['technical', 'behavioural', 'domain']),
  priority: z.enum(['must', 'nice']),
});

export const RoleInfoSchema = z.object({
  title: z.string(),
  seniority: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(RequirementSchema),
});

export const SourceInfoSchema = z.object({
  company: z.string(),
  company_url: z.string(),
  role: z.string(),
  location: z.string(),
  jd_chars: z.number().int().nonnegative(),
  researched_at: z.string(),
  pages_used: z.array(z.string()),
});

export const CompanyBriefSchema = z.object({
  summary: z.string(),
  what_they_do: z.string(),
  sources: z.array(z.string()),
});

export const QuestionSchema = z.object({
  id: z.string().min(1),
  requirement_ids: z.array(z.string()),
  category: z.enum(['technical', 'behavioural', 'system-design', 'company-fit']),
  prompt: z.string().min(1),
  answer_outline: z.string().min(1),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  _origin: z.enum(['generated', 'user_edited', 'user_added']).optional(),
  _isPinned: z.boolean().optional(),
});

export const FlashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  requirement_ids: z.array(z.string()),
  _origin: z.enum(['generated', 'user_edited', 'user_added']).optional(),
  _isPinned: z.boolean().optional(),
});

export const ScheduleDaySchema = z.object({
  day: z.number().int().positive(),
  focus: z.string().min(1),
  question_ids: z.array(z.string()),
  minutes: z.number().int().positive(),
});

export const ScheduleSchema = z.object({
  days_available: z.number().int().positive(),
  days: z.array(ScheduleDaySchema),
});

export const CoverageInfoSchema = z.object({
  uncovered_requirement_ids: z.array(z.string()),
  passes: z.number().int().positive(),
});

export const KitSchema = z.object({
  source: SourceInfoSchema,
  company_brief: CompanyBriefSchema,
  role: RoleInfoSchema,
  questions: z.array(QuestionSchema),
  flashcards: z.array(FlashcardSchema),
  schedule: ScheduleSchema,
  coverage: CoverageInfoSchema,
  _id: z.string().optional(),
  userId: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/**
 * Validates a generated Kit object against Appendix A requirements,
 * including referential integrity:
 * 1. Schema conformity
 * 2. Every question_ids in schedule refers to an existing question
 * 3. Schedule days count equals days_available
 * 4. Question difficulties are integers 1..3
 * 5. Minutes are positive integers
 */
export function validateKit(kit: unknown): { valid: boolean; errors: string[]; kit?: Kit } {
  const result = KitSchema.safeParse(kit);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  }

  const parsed = result.data as Kit;
  const errors: string[] = [];

  // Referential integrity checks
  const questionIdSet = new Set(parsed.questions.map(q => q.id));
  const requirementIdSet = new Set(parsed.role.requirements.map(r => r.id));

  // Check schedule questions exist
  for (const day of parsed.schedule.days) {
    for (const qid of day.question_ids) {
      if (!questionIdSet.has(qid)) {
        errors.push(`Schedule Day ${day.day} references unknown question_id "${qid}"`);
      }
    }
  }

  // Check schedule day count equals days_available
  if (parsed.schedule.days.length !== parsed.schedule.days_available) {
    errors.push(
      `Schedule days count (${parsed.schedule.days.length}) does not match days_available (${parsed.schedule.days_available})`
    );
  }

  // Check question requirement references
  for (const q of parsed.questions) {
    for (const rid of q.requirement_ids) {
      if (!requirementIdSet.has(rid)) {
        errors.push(`Question "${q.id}" references unknown requirement_id "${rid}"`);
      }
    }
  }

  // Check flashcard requirement references
  for (const f of parsed.flashcards) {
    for (const rid of f.requirement_ids) {
      if (!requirementIdSet.has(rid)) {
        errors.push(`Flashcard "${f.id}" references unknown requirement_id "${rid}"`);
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], kit: parsed };
}

/**
 * Zod schema for Appendix B Batch Input
 */
export const BatchCaseInputSchema = z.object({
  id: z.string().min(1),
  jd: z.string().min(1),
  company_url: z.string().min(1),
  days: z.number().int().positive(),
});

export const BatchInputFileSchema = z.array(BatchCaseInputSchema);

export function validateBatchInput(input: unknown): { valid: boolean; errors: string[]; cases?: BatchCaseInput[] } {
  const result = BatchInputFileSchema.safeParse(input);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  }
  return { valid: true, errors: [], cases: result.data };
}

/**
 * Format kit cleanly for Appendix A export (strips internal _ prefixed fields if strict export requested)
 */
export function cleanKitForExport(kit: Kit): Kit {
  return {
    source: { ...kit.source },
    company_brief: { ...kit.company_brief },
    role: {
      title: kit.role.title,
      seniority: kit.role.seniority,
      responsibilities: [...kit.role.responsibilities],
      requirements: kit.role.requirements.map(r => ({
        id: r.id,
        text: r.text,
        kind: r.kind,
        priority: r.priority,
      })),
    },
    questions: kit.questions.map(q => ({
      id: q.id,
      requirement_ids: [...q.requirement_ids],
      category: q.category,
      prompt: q.prompt,
      answer_outline: q.answer_outline,
      difficulty: q.difficulty,
    })),
    flashcards: kit.flashcards.map(f => ({
      id: f.id,
      front: f.front,
      back: f.back,
      requirement_ids: [...f.requirement_ids],
    })),
    schedule: {
      days_available: kit.schedule.days_available,
      days: kit.schedule.days.map(d => ({
        day: d.day,
        focus: d.focus,
        question_ids: [...d.question_ids],
        minutes: d.minutes,
      })),
    },
    coverage: {
      uncovered_requirement_ids: [...kit.coverage.uncovered_requirement_ids],
      passes: kit.coverage.passes,
    },
  };
}
