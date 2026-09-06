import { NextResponse } from 'next/server';
import { IntelligenceService } from '@/lib/services/intelligence-service';

export async function GET() {
  try {
    const bottlenecks = await IntelligenceService.detectBottlenecks();
    const contradictions = await IntelligenceService.detectContradictions();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      bottlenecks,
      contradictions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
