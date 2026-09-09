import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

export interface LLMOptions {
  temperature?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
}

export class LLMClient {
  private genAI: GoogleGenerativeAI | null = null;
  private modelName: string;
  private apiKey: string | null = null;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || null;
    this.modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
    }
  }

  /**
   * Generates structured JSON from the model with retry on rate limits (429)
   */
  async generateJSON<T>(prompt: string, fallbackGenerator?: () => T, options?: LLMOptions): Promise<T> {
    if (!this.genAI || !this.apiKey) {
      if (fallbackGenerator) {
        return fallbackGenerator();
      }
      throw new Error('GEMINI_API_KEY is not set in environment and no fallback provided.');
    }

    const maxRetries = 3;
    let delay = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: this.modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: options?.temperature ?? 0.2,
            maxOutputTokens: options?.maxOutputTokens ?? 4096,
          },
          systemInstruction: options?.systemInstruction,
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        return this.cleanAndParseJSON<T>(responseText);
      } catch (err: any) {
        const isRateLimit =
          err?.status === 429 ||
          err?.message?.includes('429') ||
          err?.message?.includes('RESOURCE_EXHAUSTED') ||
          err?.message?.includes('quota') ||
          err?.message?.includes('slow down');

        if (isRateLimit && attempt < maxRetries) {
          console.warn(`[LLMClient] Rate limited on attempt ${attempt}. Waiting ${delay}ms before retrying...`);
          await new Promise(r => setTimeout(r, delay));
          delay *= 2; // exponential backoff
          continue;
        }

        // If after retries it still fails and fallback is available, use fallback
        if (fallbackGenerator) {
          console.warn(`[LLMClient] LLM error: ${err.message}. Invoking robust fallback generator.`);
          return fallbackGenerator();
        }

        throw err;
      }
    }

    if (fallbackGenerator) {
      return fallbackGenerator();
    }
    throw new Error(`LLM generation failed after ${maxRetries} retries`);
  }

  /**
   * Cleans model output (e.g. markdown backticks) and parses JSON safely
   */
  private cleanAndParseJSON<T>(raw: string): T {
    let clean = raw.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/i, '').replace(/```\s*$/i, '');
    }

    try {
      return JSON.parse(clean) as T;
    } catch (parseErr: any) {
      // Clean possible trailing commas before closing braces/brackets
      const fixed = clean
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/[\u201C\u201D]/g, '"');
      return JSON.parse(fixed) as T;
    }
  }
}

export const defaultLLM = new LLMClient();
