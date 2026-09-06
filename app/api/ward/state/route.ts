import { NextResponse } from 'next/server';
import { WardService } from '@/lib/services/ward-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wardId = searchParams.get('wardId') || undefined;

    const state = await WardService.getWardLiveState(wardId);
    return NextResponse.json(state);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
