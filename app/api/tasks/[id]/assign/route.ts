import { NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/task-service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.staffId) {
      return NextResponse.json({ error: 'staffId is required' }, { status: 400 });
    }

    const result = await TaskService.assignTask({
      taskId: id,
      staffId: body.staffId,
      assignedBy: body.assignedBy,
      role: body.role,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
