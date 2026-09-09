import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { storage, UserRecord } from './storage.js';
import { runPrepKitPipeline, regenerateQuestionCategory, regenerateBriefOnly, recalculateScheduleOnly } from '../../core/pipeline.js';
import { QuestionCategory } from '../../core/types.js';
import { defaultLLM } from '../../core/llm.js';
import { validateKit, validateBatchInput, cleanKitForExport } from '../../core/validator.js';

const JWT_SECRET = process.env.JWT_SECRET || 'trao-interview-prep-jwt-secret-key-2026';

// --- Auth Middleware ---
export interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // For local ease-of-use or demo mode, support a default demo user if header is missing
    req.user = { id: 'user_demo_default', email: 'demo@trao.local' };
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
}

// --- Auth Routes ---
export const authRouter = Router();

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one capital (uppercase) letter.' };
  }
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/`~]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character.' };
  }
  return { valid: true };
}

import { sendVerificationEmail } from './mailer.js';

authRouter.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const pwdCheck = validatePassword(password);
  if (!pwdCheck.valid) {
    return res.status(400).json({ error: pwdCheck.message });
  }

  const existing = await storage.findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  // Generate 6-digit verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  const user: UserRecord = {
    id: `u_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    email,
    passwordHash: Buffer.from(password).toString('base64'),
    name: name || email.split('@')[0],
    createdAt: new Date().toISOString(),
    isVerified: false,
    verificationCode,
    verificationCodeExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  await storage.saveUser(user);

  // Dispatch verification email
  await sendVerificationEmail(email, verificationCode, user.name);

  return res.status(201).json({
    message: 'Verification code sent to your email.',
    requiresVerification: true,
    email: user.email,
    previewCode: verificationCode,
  });
});

authRouter.post('/verify-email', async (req: Request, res: Response) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required.' });
  }

  const user = await storage.findUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  if (user.isVerified) {
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, isVerified: true },
      message: 'Account is already verified.',
    });
  }

  if (user.verificationCode !== code.trim()) {
    return res.status(400).json({ error: 'Invalid verification code. Please check your email and try again.' });
  }

  // Mark as verified
  user.isVerified = true;
  delete user.verificationCode;
  delete user.verificationCodeExpiresAt;
  await storage.saveUser(user);

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  return res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, isVerified: true },
    message: 'Email successfully verified! Welcome.',
  });
});

authRouter.post('/resend-code', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const user = await storage.findUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  if (user.isVerified) {
    return res.status(400).json({ error: 'Account is already verified.' });
  }

  const newCode = Math.floor(100000 + Math.random() * 900000).toString();
  user.verificationCode = newCode;
  user.verificationCodeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await storage.saveUser(user);

  await sendVerificationEmail(email, newCode, user.name);

  return res.json({
    message: 'A new verification code has been dispatched to your email.',
    previewCode: newCode,
  });
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = await storage.findUserByEmail(email);
  if (!user || user.passwordHash !== Buffer.from(password).toString('base64')) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  // Check email verification status
  if (user.isVerified === false) {
    return res.status(403).json({
      error: 'Please verify your email address before logging in.',
      requiresVerification: true,
      email: user.email,
      previewCode: user.verificationCode,
    });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  return res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, isVerified: true },
  });
});

authRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  return res.json({ user: req.user });
});

// --- Kits Routes ---
export const kitsRouter = Router();

kitsRouter.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const kits = await storage.findKitsByUserId(userId);
  return res.json({ kits });
});

kitsRouter.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const kit = await storage.findKitById(req.params.id);
  if (!kit) {
    return res.status(404).json({ error: 'Kit not found' });
  }
  return res.json({ kit });
});

kitsRouter.post('/generate', requireAuth, async (req: AuthRequest, res: Response) => {
  const { jd, company_url, days } = req.body;
  if (!jd || !company_url) {
    return res.status(400).json({ error: 'Job description and company website URL are required.' });
  }

  const daysNum = Math.max(1, parseInt(days, 10) || 5);
  const userId = req.user!.id;

  try {
    const kit = await runPrepKitPipeline({
      jd,
      companyUrl: company_url,
      days: daysNum,
      allowLocal: process.env.ALLOW_LOCAL_URLS === 'true' || process.env.NODE_ENV !== 'production',
    });

    kit.userId = userId;
    const saved = await storage.saveKit(kit);
    return res.status(201).json({ kit: saved });
  } catch (err: any) {
    console.error('[KitsRouter] Generation failed:', err);
    return res.status(500).json({ error: `Generation failed: ${err.message}` });
  }
});

// Save inline edits and updates to a kit (Builder updates)
kitsRouter.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const existing = await storage.findKitById(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Kit not found' });
  }

  const updatedData = req.body.kit;
  if (!updatedData) {
    return res.status(400).json({ error: 'Updated kit payload required.' });
  }

  updatedData._id = existing._id;
  updatedData.userId = existing.userId;

  const saved = await storage.saveKit(updatedData);
  return res.json({ kit: saved });
});

// Selective Section Regeneration (Section 6)
// Preserves user edits and pinned questions!
kitsRouter.post('/:id/regenerate-section', requireAuth, async (req: AuthRequest, res: Response) => {
  const { section, days } = req.body;
  const kit = await storage.findKitById(req.params.id);
  if (!kit) {
    return res.status(404).json({ error: 'Kit not found' });
  }

  try {
    let updatedKit = { ...kit };

    if (section === 'company_brief') {
      updatedKit = await regenerateBriefOnly(kit);
    } else if (section === 'schedule') {
      updatedKit = recalculateScheduleOnly(kit, days);
    } else if (['technical', 'behavioural', 'system-design', 'company-fit'].includes(section)) {
      // Regenerate category while preserving user edited and pinned questions!
      updatedKit = await regenerateQuestionCategory(kit, section as QuestionCategory);
    } else {
      return res.status(400).json({ error: `Invalid section for regeneration: ${section}` });
    }

    const saved = await storage.saveKit(updatedKit);
    return res.json({ kit: saved, message: `Successfully regenerated ${section} while preserving your manual edits.` });
  } catch (err: any) {
    return res.status(500).json({ error: `Regeneration failed: ${err.message}` });
  }
});

kitsRouter.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const success = await storage.deleteKit(req.params.id, req.user!.id);
  if (!success) {
    return res.status(404).json({ error: 'Kit not found or unauthorized' });
  }
  return res.json({ success: true });
});

// --- Practice Mode Routes (Section 7) ---
export const practiceRouter = Router();

practiceRouter.get('/:kitId', requireAuth, async (req: AuthRequest, res: Response) => {
  const progress = await storage.getPracticeProgress(req.params.kitId, req.user!.id);
  return res.json({ progress: progress || { kitId: req.params.kitId, userId: req.user!.id, cardStats: {} } });
});

practiceRouter.post('/:kitId/record', requireAuth, async (req: AuthRequest, res: Response) => {
  const { cardId, confidence } = req.body;
  const userId = req.user!.id;
  const kitId = req.params.kitId;

  let progress = await storage.getPracticeProgress(kitId, userId);
  if (!progress) {
    progress = { kitId, userId, cardStats: {} };
  }

  progress.cardStats[cardId] = {
    confidence: [1, 2, 3].includes(confidence) ? confidence : 2,
    reviewedAt: new Date().toISOString(),
  };

  await storage.savePracticeProgress(progress);
  return res.json({ success: true, progress });
});

// --- Mock Interview AI Evaluator (Creative Feature) ---
export const mockInterviewRouter = Router();

mockInterviewRouter.post('/evaluate', requireAuth, async (req: AuthRequest, res: Response) => {
  const { questionPrompt, answerOutline, candidateAnswer } = req.body;
  if (!questionPrompt || !candidateAnswer) {
    return res.status(400).json({ error: 'Question prompt and candidate answer are required.' });
  }

  const fallback = () => ({
    score: 3,
    strengths: ['Addressed the core concept outlined in the prompt.', 'Clear structure and communication.'],
    missingElements: ['Could go deeper into edge cases and trade-offs.', 'Mention concrete operational metrics.'],
    feedback: 'Solid foundational response. Consider grounding your example in specific production scale and architectural trade-offs.',
  });

  const prompt = `You are an elite Engineering Hiring Manager conducting an interview debrief.
Evaluate the candidate's answer against the expected answer outline.

QUESTION PROMPT:
"${questionPrompt}"

EXPECTED ANSWER OUTLINE:
"${answerOutline || 'General engineering depth and STAR framework'}"

CANDIDATE'S ACTUAL ANSWER:
"${candidateAnswer}"

CRITICAL RULES:
1. Provide an integer "score" from 1 (poor) to 5 (exceptional).
2. "strengths": Array of 2-3 specific things the candidate articulated well.
3. "missingElements": Array of 1-3 specific key points or nuances from the outline that were omitted.
4. "feedback": A crisp 2-3 sentence actionable coaching note.

OUTPUT STRICT JSON ONLY:
{
  "score": 4,
  "strengths": ["...", "..."],
  "missingElements": ["..."],
  "feedback": "..."
}`;

  try {
    const feedback = await defaultLLM.generateJSON(prompt, fallback, {
      temperature: 0.2,
      systemInstruction: 'Output strict JSON evaluation only.',
    });
    return res.json(feedback);
  } catch (err: any) {
    return res.json(fallback());
  }
});

// --- Batch Endpoint ---
export const batchRouter = Router();

batchRouter.post('/upload', requireAuth, async (req: Request, res: Response) => {
  const rawCases = req.body;
  const validation = validateBatchInput(rawCases);
  if (!validation.valid || !validation.cases) {
    return res.status(400).json({ error: 'Invalid batch format', details: validation.errors });
  }

  const results = [];
  for (const c of validation.cases) {
    try {
      const kit = await runPrepKitPipeline({
        jd: c.jd,
        companyUrl: c.company_url,
        days: c.days,
        allowLocal: true,
      });
      results.push({ id: c.id, status: 'ok', kit: cleanKitForExport(kit), error: null });
    } catch (err: any) {
      results.push({
        id: c.id,
        status: 'failed',
        kit: null,
        error: { code: 'PROCESSING_ERROR', message: err.message },
      });
    }
  }

  return res.json({
    version: '1.0',
    generated_at: new Date().toISOString(),
    kits: results,
  });
});
