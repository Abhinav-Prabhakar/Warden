import { NextResponse } from 'next/server';
import { BedService } from '@/lib/services/bed-service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blockerTrace = await BedService.traceBedBlockers(id);
    return NextResponse.json(blockerTrace);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
