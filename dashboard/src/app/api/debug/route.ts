import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.BACKEND_URL ?? 'NOT_SET';
  return NextResponse.json({
    backend_url: url.substring(0, 50),
    set: url !== 'NOT_SET',
    length: url.length,
  });
}
