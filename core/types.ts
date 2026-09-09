/**
 * Exact data contract matching Appendix A and Appendix B from the Trao Engineering Assessment.
 */

export type RequirementKind = 'technical' | 'behavioural' | 'domain';
export type RequirementPriority = 'must' | 'nice';

export interface Requirement {
  id: string; // e.g. "r1"
  text: string;
  kind: RequirementKind;
  priority: RequirementPriority;
}

export interface RoleInfo {
  title: string;
  seniority: string;
  responsibilities: string[];
  requirements: Requirement[];
}

export interface SourceInfo {
  company: string;
  company_url: string;
  role: string;
  location: string;
  jd_chars: number;
  researched_at: string; // ISO string
  pages_used: string[];
}

export interface CompanyBrief {
  summary: string;
  what_they_do: string;
  sources: string[];
}

export type QuestionCategory = 'technical' | 'behavioural' | 'system-design' | 'company-fit';

export interface Question {
  id: string; // e.g. "q1"
  requirement_ids: string[];
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3;
  // State preservation metadata (retained during editing and selective regeneration)
  _origin?: 'generated' | 'user_edited' | 'user_added';
  _isPinned?: boolean;
}

export interface Flashcard {
  id: string; // e.g. "f1"
  front: string;
  back: string;
  requirement_ids: string[];
  // State preservation metadata
  _origin?: 'generated' | 'user_edited' | 'user_added';
  _isPinned?: boolean;
}

export interface ScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number; // integer
}

export interface Schedule {
  days_available: number;
  days: ScheduleDay[];
}

export interface CoverageInfo {
  uncovered_requirement_ids: string[];
  passes: number;
}

/**
 * Appendix A - Exact Kit Structure
 */
export interface Kit {
  source: SourceInfo;
  company_brief: CompanyBrief;
  role: RoleInfo;
  questions: Question[];
  flashcards: Flashcard[];
  schedule: Schedule;
  coverage: CoverageInfo;
  _id?: string; // MongoDB or persistence ID
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Appendix B - Batch Input Case
 */
export interface BatchCaseInput {
  id: string;
  jd: string;
  company_url: string;
  days: number;
}

export interface BatchCaseError {
  code: string;
  message: string;
}

export interface BatchCaseOutput {
  id: string;
  status: 'ok' | 'failed';
  kit: Kit | null;
  error: BatchCaseError | null;
}

/**
 * Appendix B - Batch Output File Structure
 */
export interface BatchOutputFile {
  version: string; // "1.0"
  generated_at: string; // ISO string
  kits: BatchCaseOutput[];
}

/**
 * Pipeline progress event for live UI feedback
 */
export interface PipelineProgress {
  stage: 'input_received' | 'extracting_requirements' | 'crawling_company' | 'searching_discussions' | 'generating_questions' | 'checking_coverage' | 'second_pass' | 'allocating_schedule' | 'completed' | 'failed';
  message: string;
  progressPercent: number;
  details?: Record<string, any>;
}
