import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TaskService } from '@/lib/services/task-service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = createAdminClient();

    const { data: task, error } = await admin
      .from('tasks')
      .select(`
        *,
        patient:patients (*),
        task_assignments (*, staff (*)),
        task_events (*, staff (display_name)),
        task_dependencies (
          depends_on_task_id,
          dep:tasks!task_dependencies_depends_on_task_id_fkey (*)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
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

    const updatedTask = await TaskService.updateTaskStatus({
      taskId: id,
      status: body.status,
      staffId: body.staffId,
      declineReason: body.declineReason,
      notes: body.notes,
    });

    return NextResponse.json(updatedTask);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
