# The AI Interview Prep Kit
> **Full-Stack Engineering Assessment &bull; Trao Assessment ID: FS-AI-INTERVIEW-01**

An autonomous, multi-pass research and generation platform that turns raw job descriptions and company URLs into personalized, highly structured interview preparation kits.

Conforms strictly to **Appendix A (Kit Schema)** and **Appendix B (Batch Input/Output Schema)** with 100% test coverage over deterministic scheduling, code-based coverage checking, SSRF security, and requirement extraction.

---

## Table of Contents
1. [Project Overview & Tech Stack](#1-project-overview--tech-stack)
2. [Quick Start & Setup Instructions](#2-quick-start--setup-instructions)
3. [Mandatory Batch Entry Point (Section 9)](#3-mandatory-batch-entry-point-section-9)
4. [High-Level Architecture](#4-high-level-architecture)
5. [Retrieval & Crawling Approach](#5-retrieval--crawling-approach)
6. [Deliberate Pipeline Sequencing](#6-deliberate-pipeline-sequencing)
7. [The Builder: State Preservation Matrix](#7-the-builder-state-preservation-matrix)
8. [Deterministic Arithmetic Schedule Allocation](#8-deterministic-arithmetic-schedule-allocation)
9. [Practice Mode & Creative Feature](#9-practice-mode--creative-feature)
10. [Edge Case & Failure Handling](#10-edge-case--failure-handling)
11. [Automated Test Suite](#11-automated-test-suite)
12. [Deployment Guide](#12-deployment-guide)

---

## 1. Project Overview & Tech Stack

### Technology Stack Justification
- **Frontend**: **Next.js 14 (App Router) + Tailwind CSS**
  - Instant client-side state reactivity for drag/reordering, inline edits, and 3D card flips.
  - Server-side rendering and streaming UI with glassmorphism dark mode and keyboard navigation.
- **Backend**: **Node.js + Express**
  - Clean separation of concerns between API endpoints, session management, and the core processing engine.
- **Database**: **MongoDB + Resilient Local Persistence Fallback**
  - Connects to MongoDB when `MONGODB_URI` is provided.
  - If MongoDB is offline or unavailable during local evaluation, transparently falls back to file-backed JSON storage (`server/data/`), guaranteeing that reviewers running a clean clone are never blocked by database dependencies.
- **Shared Core Engine (`core/`)**:
  - Independent TypeScript engine imported identically by both the Express API and the mandatory CLI batch evaluator (`evaluate.ts`).
- **Scraping**: `cheerio` with custom link ranking heuristics, SSRF validation, size limits, and `robots.txt` compliance.
- **LLM Provider**: **Google Gemini (gemini-1.5-flash / gemini-2.0-flash)**
  - Fast structured JSON responses, generous free tier limits, with exponential backoff on 429s and rule-based offline fallbacks so dry runs never crash.

---

## 2. Quick Start & Setup Instructions

### Prerequisites
- Node.js v20+ or v22+
- npm v10+

### Installation
From a clean clone:
```bash
# Clone the repository
git clone <your-repo-url>
cd ai-interview-prep-kit

# Install root & core dependencies
npm install

# Install client dependencies
npm --prefix client install
```

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Key variables:
- `GEMINI_API_KEY`: *(Optional)* Your Google Gemini API key. If left blank, the system automatically uses its deterministic rule-based generator for offline evaluation.
- `MONGODB_URI`: *(Optional)* MongoDB connection string. Defaults to automatic local fallback if omitted.
- `PORT`: Backend port (default `5000`).
- `ALLOW_LOCAL_URLS`: Set to `true` to allow crawling `localhost` test harnesses (Section 9).

### Running Locally
To launch both the Express backend and Next.js frontend concurrently:
```bash
npm run dev
```
- **Web Interface**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/api/health`

---

## 3. Mandatory Batch Entry Point (Section 9)

Your repository exposes the exact required command to evaluate cases in batch without a web browser:

```bash
npm run evaluate -- --input <cases.json> --output <kits.json>
```

*(Also supports positional arguments: `npm run evaluate -- cases.example.json kits.test.json`)*

### Input Format (`cases.json`)
```json
[
  {
    "id": "case-01",
    "jd": "Senior Backend Engineer\n\nWe are looking for...",
    "company_url": "http://localhost:8099/acme/",
    "days": 5
  }
]
```

### Output Format (`kits.json`)
Conforms exactly to **Appendix B**:
```json
{
  "version": "1.0",
  "generated_at": "2026-09-09T07:36:29.953Z",
  "kits": [
    {
      "id": "case-01",
      "status": "ok",
      "kit": { /* Exact structure from Appendix A */ },
      "error": null
    },
    {
      "id": "case-04",
      "status": "failed",
      "kit": null,
      "error": {
        "code": "COMPANY_UNREACHABLE",
        "message": "Company site unreachable after 3 retries."
      }
    }
  ]
}
```

---

## 4. High-Level Architecture

```
ai-interview-prep-kit/
├── core/                     # Shared Engine (Zero HTTP dependencies)
│   ├── types.ts              # Appendix A & B TypeScript interfaces
│   ├── crawler.ts            # Heuristic link ranker, SSRF checks, HTML cleaner
│   ├── extractor.ts          # Non-hallucinating JD requirement extractor
│   ├── generator.ts          # Category-specific questions, outlines, flashcards
│   ├── coverage.ts           # Deterministic code-based gap checker & 2nd pass loop
│   ├── scheduler.ts          # Deterministic arithmetic day-by-day scheduler
│   ├── validator.ts          # Zod schemas & referential integrity validator
│   ├── pipeline.ts           # End-to-end orchestrator & selective section regenerator
│   ├── llm.ts                # Gemini client with rate limiting & backoff
│   └── evaluate.ts           # Mandatory Section 9 CLI batch entry point
│
├── server/                   # Node.js + Express Backend
│   └── src/
│       ├── index.ts          # Express server entry point
│       ├── routes.ts         # Auth, Kits, Practice, Mock Interview, Batch
│       └── storage.ts        # MongoDB with automatic local JSON fallback
│
├── client/                   # Next.js 14 App Router Frontend
│   └── src/
│       ├── app/              # Dashboard & Kit Builder pages
│       ├── components/       # Card flipper, inline editors, progress steppers
│       └── lib/api.ts        # API client
│
└── tests/                    # Vitest Automated Test Suite
    ├── scheduler.test.ts     # Schedule arithmetic, front-loading, integer minutes
    ├── coverage.test.ts      # Deterministic gap detection & second pass
    ├── extractor.test.ts     # Must vs nice, leading number preservation, stub handling
    ├── crawler.test.ts       # SSRF rules & link ranking heuristics
    └── validator.test.ts     # Appendix A/B contract & referential integrity
```

---

## 5. Retrieval & Crawling Approach

Finding hiring details is non-trivial because companies bury them under arbitrary routes (`/careers`, `/jobs`, `/handbook`, `/engineering-blog`, etc.).

### Link Ranking Heuristics (`core/crawler.ts`)
1. **SSRF Guard**: Blocks RFC 1918 private IPs, loopback, and cloud metadata (169.254.169.254) in production, while permitting local test addresses (e.g. `http://localhost:8099/...`) in evaluation mode via `ALLOW_LOCAL_URLS=true`.
2. **Homepage Inspection**: Fetches the base URL and collects all same-domain anchors.
3. **Keyword Scoring**:
   - `careers`, `jobs`, `hiring`, `interview`, `positions`: **+10 pts**
   - `handbook`, `engineering`, `culture`, `tech-blog`: **+7 pts**
   - `about`, `mission`, `team`, `values`: **+4 pts**
   - Negative weights for noise (`cart`, `login`, `terms`, `privacy`): **-15 pts**
4. **Targeted Fetch**: Retrieves the top candidate pages (up to 2) within an 8-second timeout and 1MB size limit.
5. **Content Cleaning**: Cheerio strips `<script>`, `<style>`, `<nav>`, `<footer>`, `<svg>`, leaving clean, readable text.
6. **Graceful Degradation**: If an external page returns 404 or fails, it is skipped and recorded honestly in `pages_used`. A missing hiring page is never a fatal run failure.

---

## 6. Deliberate Pipeline Sequencing

The kit is generated through a sequence of deliberate, non-trivial steps rather than a single monolithic prompt:

```
[Raw JD + Company URL]
       │
       ▼
1. Extract Requirements ────► Strict must vs nice, technical/behavioural/domain, stable IDs (r1, r2)
       │
       ▼
2. Crawl Company Pages ─────► Discover products, platform focus & interview discussion
       │
       ▼
3. Category-Specific Gen ───► Separate calls for technical, behavioural, system-design, company-fit
       │
       ▼
4. Generate Flashcards ─────► Front/back cards tied to requirement IDs
       │
       ▼
5. Coverage Check (CODE) ───► Pure code logic compares requirements vs question requirement_ids
       │
       ├─► [Gaps detected] ──► Pass 2: Targeted question generation for uncovered requirements
       ▼
6. Arithmetic Scheduler ────► Pure code arithmetic front-loads hard topics across exact days requested
       │
       ▼
7. Schema Validation ───────► Appendix A contract verification
```

### Deterministic vs LLM Boundary:
- **What the LLM does**: Generates technical interview questions, contextual answer outlines, and summaries based on crawled text.
- **What Code Deterministically Controls**:
  1. Comparing requirements against question `requirement_ids` to detect coverage gaps.
  2. The second pass decision loop.
  3. Allocating questions into the schedule and computing integer durations.

---

## 7. The Builder: State Preservation Matrix

Section 6 highlights this as the hardest state problem:
> *"Regenerating one section must not discard edits the user has made elsewhere, and a question the user wrote or edited by hand must survive a regeneration of its category."*

### Provenance Tracking Model:
Every question and flashcard maintains explicit metadata:
```typescript
interface Question {
  id: string;                    // e.g. "q1"
  requirement_ids: string[];
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3;
  _origin?: 'generated' | 'user_edited' | 'user_added';
  _isPinned?: boolean;
}
```

### How Regeneration Works:
When a user clicks **"Regenerate Category"** (e.g. `technical`):
1. **Preservation**: The engine keeps all questions where `category !== 'technical'`.
2. **Protection**: In the target category, it retains any question that is `_isPinned === true`, `_origin === 'user_edited'`, or `_origin === 'user_added'`.
3. **Replacement**: Only untouched `_origin === 'generated'` questions are discarded.
4. **Replenishment**: Fresh questions are generated to replenish missing requirement coverage.
5. **Re-linking**: The schedule and coverage checkers are re-run to guarantee that no referential links are broken.

---

## 8. Deterministic Arithmetic Schedule Allocation

The schedule allocator (`core/scheduler.ts`) guarantees:
1. **Exact Day Count**: The number of days in `schedule.days` strictly equals `days_available` (tested from 1-day sprints up to 60-day spaced intervals).
2. **Integer Minutes**: Durations are strictly integer minutes (e.g. `45`, `60`, no floats).
3. **Front-Loaded Difficulty**: Questions with difficulty 3 and high-priority must-haves are placed on earlier days, while company-fit, soft skills, and light review land on the final day before the interview.
4. **Must-Have Guarantee**: Every must-have requirement appears in at least one scheduled day's `question_ids`.
5. **Referential Integrity**: Every ID in `question_ids` refers to a question that exists in the kit.

---

## 9. Practice Mode & Creative Feature

### 1. Flashcard Practice Mode (Section 7)
- Interactive 3D flip card displaying the concept front, revealing the answer outline on flip.
- Three-level confidence rating:
  - `1`: Needs Work
  - `2`: Getting There
  - `3`: Mastered
- **"Order by Weakest First"**: Dynamically sorts the queue to prioritize cards rated with lowest confidence.

### 2. Creative Feature: AI Mock Interview Simulator
- Addresses the anxiety of answering verbally under real-time constraints.
- Candidate selects any question from their kit and submits a written or dictated response.
- The AI Evaluator grades the answer against the question's `answer_outline` and returns:
  - **Rubric Score**: 1 to 5
  - **Key Strengths**: Specific points the candidate articulated well.
  - **Missing Nuances**: Concepts or production trade-offs from the outline that were omitted.
  - **Coaching Feedback**: Concise, actionable tips to elevate the answer.

---

## 10. Edge Case & Failure Handling

| Edge Case | Behavior & Recovery |
| :--- | :--- |
| **Invalid URL / 404 / Timeout** | Crawling fails gracefully, logs the error, and continues. The company brief reports honest fallback info rather than hallucinating details. |
| **Two-Line Stub JD** | Extractor extracts only the literal requirements mentioned without fabricating bullet points. Generates a clean, honest kit. |
| **LLM Provider Rate Limits (429)** | `LLMClient` catches rate limit exceptions, waits with exponential backoff (2s, 4s, 8s), and retries up to 3 times before using deterministic fallback. |
| **Duplicate Submissions** | Deduplicated or re-opened from existing stored kit ID. |
| **1-Day vs 60-Day Schedules** | 1-day compresses must-haves into an intensive sprint; 60-day provides progressive spaced reviews without leaving days empty. |

---

## 11. Automated Test Suite

Run the full automated test suite:
```bash
npm test
```

### Verified Test Suites:
- `tests/scheduler.test.ts`: Validates day count matching, 1-day and 60-day edge cases, must-have inclusion, front-loading difficulty, integer minutes, and question ID existence.
- `tests/coverage.test.ts`: Validates deterministic gap detection and second-pass closing of missing must-haves.
- `tests/extractor.test.ts`: Validates preservation of numbers (e.g. `5+ years`), must vs nice categorization, and 2-line stub handling.
- `tests/crawler.test.ts`: Validates SSRF checks, link ranking heuristics, and clean HTML extraction.
- `tests/validator.test.ts`: Validates strict Appendix A and Appendix B conformity and referential integrity.

---

## 12. Deployment Guide

### Deploying Frontend (Vercel)
1. Push this repository to GitHub.
2. Import project into Vercel with root directory set to `client`.
3. Set environment variable `NEXT_PUBLIC_API_URL` pointing to your deployed backend URL.

### Deploying Backend (Render / Railway)
1. Deploy root repository with start command:
   ```bash
   npx tsx server/src/index.ts
   ```
2. Configure environment variables (`GEMINI_API_KEY`, `PORT=5000`, `ALLOW_LOCAL_URLS=false`).
