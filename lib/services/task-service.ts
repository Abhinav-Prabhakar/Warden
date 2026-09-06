import { createAdminClient } from '@/lib/supabase/admin';
import { TaskStatus, TaskType, TaskUrgency, Json } from '@/types/database';
import { TaskBlockerTrace } from '@/types/warden';
import { EventService } from './event-service';

export class TaskService {
  private static adminClient = createAdminClient();

  /**
   * Create a new operational task
   */
  static async createTask(params: {
    hospitalId: string;
    patientId?: string | null;
    createdBy?: string | null;
    taskType: TaskType;
    title: string;
    description?: string;
    priority?: number;
    urgency?: TaskUrgency;
    dueAt?: string;
    source?: string;
    assigneeStaffId?: string;
    dependsOnTaskIds?: string[];
  }) {
    const { data: task, error } = await this.adminClient
      .from('tasks')
      .insert({
        hospital_id: params.hospitalId,
        patient_id: params.patientId || null,
        created_by: params.createdBy || null,
        task_type: params.taskType,
        title: params.title,
        description: params.description || null,
        priority: params.priority ?? 3,
        urgency: params.urgency ?? 'routine',
        status: params.assigneeStaffId ? 'assigned' : 'pending',
        due_at: params.dueAt || null,
        source: params.source || 'voice',
      })
      .select()
      .single();

    if (error || !task) {
      throw new Error(`Failed to create task: ${error?.message}`);
    }

    // Record creation event
    await this.adminClient.from('task_events').insert({
      task_id: task.id,
      event_type: 'created',
      actor_staff_id: params.createdBy || null,
      metadata: { urgency: task.urgency, priority: task.priority } as Json,
    });

    if (params.patientId) {
      await EventService.logPatientEvent({
        patientId: params.patientId,
        eventType: 'task_created',
        actorId: params.createdBy || null,
        metadata: { taskId: task.id, title: task.title, urgency: task.urgency },
      });
    }

    // Handle initial assignment if provided
    if (params.assigneeStaffId) {
      await this.assignTask({
        taskId: task.id,
        staffId: params.assigneeStaffId,
        assignedBy: params.createdBy || null,
      });
    }

    // Handle dependencies if provided
    if (params.dependsOnTaskIds && params.dependsOnTaskIds.length > 0) {
      const depInserts = params.dependsOnTaskIds.map((depId) => ({
        task_id: task.id,
        depends_on_task_id: depId,
        dependency_type: 'finish_to_start',
      }));
      await this.adminClient.from('task_dependencies').insert(depInserts);
    }

    return task;
  }

  /**
   * Closed-loop Task Assignment
   */
  static async assignTask(params: {
    taskId: string;
    staffId: string;
    assignedBy?: string | null;
    role?: string;
  }) {
    // 1. Verify staff member exists and is available
    const { data: staffMember, error: staffErr } = await this.adminClient
      .from('staff')
      .select('id, display_name, status, is_on_duty')
      .eq('id', params.staffId)
      .single();

    if (staffErr || !staffMember) {
      throw new Error(`Staff member not found: ${params.staffId}`);
    }

    // 2. Insert into task_assignments history
    const { data: assignment, error: assignErr } = await this.adminClient
      .from('task_assignments')
      .insert({
        task_id: params.taskId,
        staff_id: params.staffId,
        assignment_role: params.role || 'primary',
        assigned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (assignErr) {
      throw new Error(`Failed to record task assignment: ${assignErr.message}`);
    }

    // 3. Update task status
    const { data: updatedTask, error: updateErr } = await this.adminClient
      .from('tasks')
      .update({
        status: 'assigned',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.taskId)
      .select()
      .single();

    if (updateErr) {
      throw new Error(`Failed to update task status: ${updateErr.message}`);
    }

    // 4. Log event
    await this.adminClient.from('task_events').insert({
      task_id: params.taskId,
      event_type: 'assigned',
      actor_staff_id: params.assignedBy || null,
      metadata: { assigned_to: staffMember.display_name, staff_id: staffMember.id } as Json,
    });

    return { task: updatedTask, assignment };
  }

  /**
   * Update task lifecycle state (acknowledged, in_progress, completed, declined, cancelled)
   */
  static async updateTaskStatus(params: {
    taskId: string;
    status: TaskStatus;
    staffId?: string | null;
    declineReason?: string;
    notes?: string;
  }) {
    const now = new Date().toISOString();
    const updateData: import('@/types/database').Database['public']['Tables']['tasks']['Update'] = {
      status: params.status,
      updated_at: now,
    };

    if (params.status === 'in_progress') {
      updateData.started_at = now;
    } else if (params.status === 'completed') {
      updateData.completed_at = now;
    } else if (params.status === 'cancelled') {
      updateData.cancelled_at = now;
    }

    const { data: updatedTask, error } = await this.adminClient
      .from('tasks')
      .update(updateData)
      .eq('id', params.taskId)
      .select('*, patient_id')
      .single();

    if (error || !updatedTask) {
      throw new Error(`Failed to update task status: ${error?.message}`);
    }

    // If completed or accepted, update active task_assignments
    if (params.staffId) {
      if (params.status === 'acknowledged') {
        await this.adminClient
          .from('task_assignments')
          .update({ accepted_at: now })
          .eq('task_id', params.taskId)
          .eq('staff_id', params.staffId);
      } else if (params.status === 'in_progress') {
        await this.adminClient
          .from('task_assignments')
          .update({ started_at: now })
          .eq('task_id', params.taskId)
          .eq('staff_id', params.staffId);
      } else if (params.status === 'completed') {
        await this.adminClient
          .from('task_assignments')
          .update({ completed_at: now })
          .eq('task_id', params.taskId)
          .eq('staff_id', params.staffId);
      } else if (params.status === 'pending' && params.declineReason) {
        // Staff declined assignment
        await this.adminClient
          .from('task_assignments')
          .update({ declined_at: now, decline_reason: params.declineReason })
          .eq('task_id', params.taskId)
          .eq('staff_id', params.staffId);
      }
    }

    // Log task event
    const eventType =
      params.status === 'acknowledged'
        ? 'accepted'
        : params.status === 'in_progress'
        ? 'started'
        : params.status === 'completed'
        ? 'completed'
        : params.status === 'cancelled'
        ? 'cancelled'
        : 'reassigned';

    await this.adminClient.from('task_events').insert({
      task_id: params.taskId,
      event_type: eventType,
      actor_staff_id: params.staffId || null,
      metadata: { notes: params.notes || null, declineReason: params.declineReason || null } as Json,
    });

    if (updatedTask.patient_id) {
      await EventService.logPatientEvent({
        patientId: updatedTask.patient_id,
        eventType: `task_${params.status}`,
        actorId: params.staffId || null,
        metadata: { taskId: updatedTask.id, title: updatedTask.title },
      });
    }

    return updatedTask;
  }

  /**
   * Trace why a task is blocked (Dependency resolution)
   */
  static async traceTaskBlockers(taskId: string): Promise<TaskBlockerTrace> {
    const { data: task, error } = await this.adminClient
      .from('tasks')
      .select('id, title, status')
      .eq('id', taskId)
      .single();

    if (error || !task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Find all tasks that this task depends on
    const { data: dependencies } = await this.adminClient
      .from('task_dependencies')
      .select(`
        depends_on_task_id,
        dep_task:tasks!task_dependencies_depends_on_task_id_fkey (
          id,
          title,
          status,
          task_assignments (
            staff:staff (display_name),
            completed_at
          )
        )
      `)
      .eq('task_id', taskId);

    const unresolvedDeps = (dependencies || [])
      .map((d: any) => d.dep_task)
      .filter((dep: any) => dep && dep.status !== 'completed')
      .map((dep: any) => {
        const activeAssignment = dep.task_assignments?.find((a: any) => !a.completed_at);
        return {
          id: dep.id,
          title: dep.title,
          status: dep.status as TaskStatus,
          assigned_to: activeAssignment?.staff?.display_name || null,
        };
      });

    return {
      task_id: task.id,
      title: task.title,
      status: task.status as TaskStatus,
      is_blocked: unresolvedDeps.length > 0 || task.status === 'blocked',
      unresolved_dependencies: unresolvedDeps,
    };
  }
}
