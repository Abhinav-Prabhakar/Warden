import { NextResponse } from 'next/server';
import { IntelligenceService } from '@/lib/services/intelligence-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId') || undefined;

    const actions = await IntelligenceService.getPrioritizedNextActions(staffId);
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      recommendations: actions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
