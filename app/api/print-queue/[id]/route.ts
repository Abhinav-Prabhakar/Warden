import { NextResponse } from 'next/server';
import { PrintService } from '@/lib/services/print-service';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cancelled = await PrintService.cancelPrintJob(id);
    return NextResponse.json(cancelled);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const retried = await PrintService.retryPrintJob(id);
    return NextResponse.json(retried);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
