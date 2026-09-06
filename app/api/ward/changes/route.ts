import { NextResponse } from 'next/server';
import { WardService } from '@/lib/services/ward-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // Default to 1 hour ago if not provided
    const defaultSince = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const since = searchParams.get('since') || defaultSince;

    const changes = await WardService.getWhatChanged(since);
    return NextResponse.json(changes);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
