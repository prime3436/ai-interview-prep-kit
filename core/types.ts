
export type RequirementKind = 'technical' | 'behavioural' | 'domain';
export type RequirementPriority = 'must' | 'nice';

export interface Requirement {
  id: string;
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
  researched_at: string;
  pages_used: string[];
}

export interface CompanyBrief {
  summary: string;
  what_they_do: string;
  sources: string[];
}

export type QuestionCategory = 'technical' | 'behavioural' | 'system-design' | 'company-fit';

export interface Question {
  id: string;
  requirement_ids: string[];
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3;

  _origin?: 'generated' | 'user_edited' | 'user_added';
  _isPinned?: boolean;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];

  _origin?: 'generated' | 'user_edited' | 'user_added';
  _isPinned?: boolean;
}

export interface ScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number;
}

export interface Schedule {
  days_available: number;
  days: ScheduleDay[];
}

export interface CoverageInfo {
  uncovered_requirement_ids: string[];
  passes: number;
}

export interface Kit {
  source: SourceInfo;
  company_brief: CompanyBrief;
  role: RoleInfo;
  questions: Question[];
  flashcards: Flashcard[];
  schedule: Schedule;
  coverage: CoverageInfo;
  _id?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

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

export interface BatchOutputFile {
  version: string;
  generated_at: string;
  kits: BatchCaseOutput[];
}

export interface PipelineProgress {
  stage: 'input_received' | 'extracting_requirements' | 'crawling_company' | 'searching_discussions' | 'generating_questions' | 'checking_coverage' | 'second_pass' | 'allocating_schedule' | 'completed' | 'failed';
  message: string;
  progressPercent: number;
  details?: Record<string, any>;
}

