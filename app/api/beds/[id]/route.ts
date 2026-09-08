import { NextResponse } from 'next/server';
import { WardService } from '@/lib/services/ward-service';
import { BedService } from '@/lib/services/bed-service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const floorParam = searchParams.get('floor');
    const floor = floorParam ? parseInt(floorParam, 10) : undefined;
    const drilldown = await WardService.getBedDrilldown(id, floor);
    return NextResponse.json(drilldown);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const updated = await BedService.updateBedStatus(id, body.status, body.reason);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
