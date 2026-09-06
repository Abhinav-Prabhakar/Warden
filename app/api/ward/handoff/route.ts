import { NextResponse } from 'next/server';
import { IntelligenceService } from '@/lib/services/intelligence-service';

export async function GET() {
  try {
    const handoff = await IntelligenceService.generateShiftHandoff();
    return NextResponse.json(handoff);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
