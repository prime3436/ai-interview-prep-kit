import {
  Kit,
  PipelineProgress,
  QuestionCategory,
  Question,
  Flashcard,
} from './types.js';
import { crawlCompanySite } from './crawler.js';
import { extractRoleAndRequirements } from './extractor.js';
import {
  generateCompanyBrief,
  generateCategoryQuestions,
  generateFlashcards,
  GenerationContext,
} from './generator.js';
import { runCoveragePasses } from './coverage.js';
import { allocateSchedule } from './scheduler.js';
import { validateKit, cleanKitForExport } from './validator.js';
import { LLMClient, defaultLLM } from './llm.js';

export interface PipelineOptions {
  jd: string;
  companyUrl: string;
  days: number;
  allowLocal?: boolean;
  onProgress?: (progress: PipelineProgress) => void;
  llm?: LLMClient;
}

export async function runPrepKitPipeline(options: PipelineOptions): Promise<Kit> {
  const { jd, companyUrl, days, allowLocal = true, onProgress, llm = defaultLLM } = options;

  const emit = (stage: PipelineProgress['stage'], message: string, progressPercent: number, details?: any) => {
    if (onProgress) {
      onProgress({ stage, message, progressPercent, details });
    }
  };

  emit('input_received', 'Received job description and target company details', 5);

  emit('extracting_requirements', 'Extracting role requirements with zero-hallucination constraint...', 15);
  const role = await extractRoleAndRequirements(jd, llm);

  emit('crawling_company', `Crawling company site (${companyUrl}) and ranking links...`, 30);
  const crawl = await crawlCompanySite(companyUrl, allowLocal);

  let companyName = 'Target Company';
  try {
    const urlObj = new URL(companyUrl);
    const domainParts = urlObj.hostname.replace(/^www\./, '').split('.');
    companyName = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);
    if (crawl.pages.length > 0 && crawl.pages[0].title) {
      const titleClean = crawl.pages[0].title.split(/[-–|]/)[0].trim();
      if (titleClean.length > 2 && titleClean.length < 35) {
        companyName = titleClean;
      }
    }
  } catch {

  }

  emit('searching_discussions', 'Synthesizing company brief and public interview context...', 45);
  const company_brief = await generateCompanyBrief(companyName, crawl.what_they_do_text, crawl.pages_used, llm);

  const context: GenerationContext = {
    companyName,
    whatTheyDo: crawl.what_they_do_text,
    hiringProcess: crawl.hiring_process_text,
    publicDiscussion: crawl.public_discussion_text,
    sources: crawl.pages_used,
  };

  emit('generating_questions', 'Generating category-specific interview questions & outlines...', 60);

  const techReqs = role.requirements.filter(r => r.kind === 'technical');
  const behavReqs = role.requirements.filter(r => r.kind === 'behavioural');
  const allReqs = role.requirements;

  let currentQId = 1;

  const techQuestions = await generateCategoryQuestions(
    'technical',
    techReqs.length > 0 ? techReqs : allReqs.slice(0, 3),
    context,
    currentQId,
    llm
  );
  currentQId += techQuestions.length;

  const behavQuestions = await generateCategoryQuestions(
    'behavioural',
    behavReqs.length > 0 ? behavReqs : allReqs.slice(0, 2),
    context,
    currentQId,
    llm
  );
  currentQId += behavQuestions.length;

  const sysQuestions = await generateCategoryQuestions(
    'system-design',
    techReqs.slice(0, 2).length > 0 ? techReqs.slice(0, 2) : allReqs.slice(0, 1),
    context,
    currentQId,
    llm
  );
  currentQId += sysQuestions.length;

  const fitQuestions = await generateCategoryQuestions(
    'company-fit',
    allReqs.slice(0, 2),
    context,
    currentQId,
    llm
  );

  const initialQuestions = [...techQuestions, ...behavQuestions, ...sysQuestions, ...fitQuestions];

  const flashcards = await generateFlashcards(allReqs, context, llm);

  emit('checking_coverage', 'Performing deterministic code-based coverage gap analysis...', 75);
  const { questions, coverage } = await runCoveragePasses(role.requirements, initialQuestions, context, 2, llm);

  if (coverage.passes > 1) {
    emit('second_pass', `Executed Second Pass to cover missing requirement gaps (Pass ${coverage.passes})`, 85);
  }

  emit('allocating_schedule', 'Allocating preparation schedule with front-loaded priorities...', 92);
  const schedule = allocateSchedule(days, questions, role.requirements);

  const kit: Kit = {
    source: {
      company: companyName,
      company_url: companyUrl,
      role: role.title,
      location: 'Remote / Hybrid',
      jd_chars: jd.length,
      researched_at: new Date().toISOString(),
      pages_used: crawl.pages_used.length > 0 ? crawl.pages_used : [companyUrl],
    },
    company_brief,
    role,
    questions,
    flashcards,
    schedule,
    coverage,
  };

  const validation = validateKit(kit);
  if (!validation.valid) {
    console.warn('[Pipeline] Kit validation warnings:', validation.errors);
  }

  emit('completed', 'Interview preparation kit successfully generated!', 100);
  return kit;
}

export async function regenerateQuestionCategory(
  kit: Kit,
  categoryToRegenerate: QuestionCategory,
  llm: LLMClient = defaultLLM
): Promise<Kit> {
  const context: GenerationContext = {
    companyName: kit.source.company,
    whatTheyDo: kit.company_brief.what_they_do,
    hiringProcess: '',
    publicDiscussion: '',
    sources: kit.company_brief.sources,
  };

  const preservedQuestions: Question[] = [];
  for (const q of kit.questions) {
    if (q.category !== categoryToRegenerate) {
      preservedQuestions.push(q);
    } else {

      if (q._isPinned || q._origin === 'user_edited' || q._origin === 'user_added') {
        preservedQuestions.push(q);
      }
    }
  }

  const targetReqs = kit.role.requirements.filter(r => {
    if (categoryToRegenerate === 'technical') return r.kind === 'technical';
    if (categoryToGenerateKind(categoryToRegenerate) === r.kind) return true;
    return true;
  });

  const nextId = Math.max(0, ...kit.questions.map(q => parseInt(q.id.replace(/\D/g, '') || '0', 10))) + 1;
  const newQuestions = await generateCategoryQuestions(
    categoryToRegenerate,
    targetReqs.length > 0 ? targetReqs : kit.role.requirements.slice(0, 2),
    context,
    nextId,
    llm
  );

  const updatedQuestions = [...preservedQuestions, ...newQuestions];

  const { questions: finalQuestions, coverage } = await runCoveragePasses(
    kit.role.requirements,
    updatedQuestions,
    context,
    2,
    llm
  );

  const schedule = allocateSchedule(kit.schedule.days_available, finalQuestions, kit.role.requirements);

  return {
    ...kit,
    questions: finalQuestions,
    schedule,
    coverage,
  };
}

function categoryToGenerateKind(cat: QuestionCategory): string {
  if (cat === 'behavioural') return 'behavioural';
  if (cat === 'technical' || cat === 'system-design') return 'technical';
  return 'domain';
}

export async function regenerateBriefOnly(kit: Kit, llm: LLMClient = defaultLLM): Promise<Kit> {
  const newBrief = await generateCompanyBrief(
    kit.source.company,
    kit.company_brief.what_they_do,
    kit.company_brief.sources,
    llm
  );

  return {
    ...kit,
    company_brief: newBrief,
  };
}

export function recalculateScheduleOnly(kit: Kit, newDays?: number): Kit {
  const days = newDays ?? kit.schedule.days_available;
  const schedule = allocateSchedule(days, kit.questions, kit.role.requirements);
  return {
    ...kit,
    schedule,
  };
}

