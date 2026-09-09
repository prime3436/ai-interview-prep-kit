import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'AI Interview Prep Kit API is active. Access kits via web dashboard or run batch evaluation CLI via npm run evaluate.',
    sample_kit_url: '/kits/kit_1788949314534_7wpra9'
  });
}
