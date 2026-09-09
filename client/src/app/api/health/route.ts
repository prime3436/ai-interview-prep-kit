import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'AI Interview Prep Kit API',
    version: '1.0.0',
    platform: 'Next.js 14 / Vercel Serverless',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/health',
      '/api/kits',
      '/api/auth/login',
      '/api/auth/register',
      '/api/mock-interview/evaluate'
    ]
  });
}
