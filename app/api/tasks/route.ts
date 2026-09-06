import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TaskService } from '@/lib/services/task-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');

    const admin = createAdminClient();
    let query = admin
      .from('tasks')
      .select(`
        *,
        patient:patients (first_name, last_name, beds (bed_number)),
        task_assignments (
          id,
          assignment_role,
          staff:staff (id, display_name, role)
        )
      `)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });

    if (patientId) query = query.eq('patient_id', patientId);
    if (status) query = query.eq('status', status);

    const { data: tasks, error } = await query;
    if (error) throw error;

    return NextResponse.json(tasks);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.title || !body.taskType) {
      return NextResponse.json({ error: 'Title and taskType are required' }, { status: 400 });
    }

    const admin = createAdminClient();
    let hospitalId = body.hospitalId;
    if (!hospitalId) {
      const { data } = await admin.from('hospitals').select('id').limit(1).single();
      hospitalId = data?.id;
    }

    const task = await TaskService.createTask({
      hospitalId,
      patientId: body.patientId,
      createdBy: body.createdBy,
      taskType: body.taskType,
      title: body.title,
      description: body.description,
      priority: body.priority,
      urgency: body.urgency,
      dueAt: body.dueAt,
      source: body.source || 'ui',
      assigneeStaffId: body.assigneeStaffId,
      dependsOnTaskIds: body.dependsOnTaskIds,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
