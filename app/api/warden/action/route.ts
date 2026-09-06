import { NextResponse } from 'next/server';
import { IntelligenceService } from '@/lib/services/intelligence-service';
import { EventService } from '@/lib/services/event-service';
import { TaskService } from '@/lib/services/task-service';
import { BedService } from '@/lib/services/bed-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userCommand,
      actionType,
      targetType,
      targetId,
      entityChecks,
      payload,
      staffId,
    } = body;

    if (!userCommand || !actionType) {
      return NextResponse.json({ error: 'userCommand and actionType are required' }, { status: 400 });
    }

    // Step 1: Self-Invalidation Verification
    // Rule 1: The current ward state beats the state from 5 seconds ago
    if (entityChecks && entityChecks.length > 0) {
      const invalidationResult = await IntelligenceService.evaluateSelfInvalidation({
        queryStartTime: body.queryStartTime || new Date().toISOString(),
        entityChecks,
      });

      if (invalidationResult.is_stale) {
        // Log that action was aborted due to state change
        await EventService.logWardenAction({
          staffId,
          actionType,
          targetType: targetType || 'unknown',
          targetId,
          userCommand,
          decisionReason: `Aborted due to state invalidation: ${invalidationResult.reason}`,
          executed: false,
          executionResult: { aborted: true, stale_reason: invalidationResult.reason },
        });

        return NextResponse.json({
          executed: false,
          self_invalidated: true,
          reason: invalidationResult.reason,
          spoken_correction: invalidationResult.correction,
          current_state: invalidationResult.state_current,
        });
      }
    }

    // Step 2: Execute Action
    let result: any = null;

    if (actionType === 'assign_task' && targetId && payload?.staffId) {
      result = await TaskService.assignTask({
        taskId: targetId,
        staffId: payload.staffId,
        assignedBy: staffId,
      });
    } else if (actionType === 'update_task_status' && targetId && payload?.status) {
      result = await TaskService.updateTaskStatus({
        taskId: targetId,
        status: payload.status,
        staffId,
        notes: payload.notes,
      });
    } else if (actionType === 'update_bed_status' && targetId && payload?.status) {
      result = await BedService.updateBedStatus(targetId, payload.status, payload.reason);
    } else {
      result = { status: 'acknowledged', action: actionType };
    }

    // Step 3: Log Action Audit
    await EventService.logWardenAction({
      staffId,
      actionType,
      targetType: targetType || 'general',
      targetId,
      userCommand,
      executed: true,
      executionResult: result,
    });

    return NextResponse.json({
      executed: true,
      self_invalidated: false,
      action_type: actionType,
      result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
