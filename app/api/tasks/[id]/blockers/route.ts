import { NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/task-service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const trace = await TaskService.traceTaskBlockers(id);
    return NextResponse.json(trace);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
