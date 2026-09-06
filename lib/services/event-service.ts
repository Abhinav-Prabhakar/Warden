import { createAdminClient } from '@/lib/supabase/admin';
import { Json } from '@/types/database';

export class EventService {
  private static adminClient = createAdminClient();

  /**
   * Log an event into the append-only patient_events timeline
   */
  static async logPatientEvent(params: {
    patientId: string;
    eventType: string;
    actorType?: string;
    actorId?: string | null;
    severity?: string;
    source?: string;
    metadata?: Record<string, unknown>;
  }) {
    const { data, error } = await this.adminClient
      .from('patient_events')
      .insert({
        patient_id: params.patientId,
        event_type: params.eventType,
        actor_type: params.actorType || 'system',
        actor_id: params.actorId || null,
        severity: params.severity || 'routine',
        source: params.source || 'system',
        metadata: (params.metadata || {}) as Json,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to log patient event:', error);
      throw error;
    }
    return data;
  }

  /**
   * Log an event into the append-only system_events timeline
   */
  static async logSystemEvent(params: {
    eventType: string;
    entityType: string;
    entityId: string;
    actorType?: string;
    actorId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const { data, error } = await this.adminClient
      .from('system_events')
      .insert({
        event_type: params.eventType,
        entity_type: params.entityType,
        entity_id: params.entityId,
        actor_type: params.actorType || 'system',
        actor_id: params.actorId || null,
        metadata: (params.metadata || {}) as Json,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to log system event:', error);
      throw error;
    }
    return data;
  }

  /**
   * Record Warden decision/action for accountability and verification
   */
  static async logWardenAction(params: {
    sessionId?: string | null;
    staffId?: string | null;
    actionType: string;
    targetType: string;
    targetId?: string | null;
    userCommand: string;
    interpretedIntent?: Record<string, unknown>;
    decisionReason?: string;
    proposedAction?: Record<string, unknown>;
    confirmationRequired?: boolean;
    confirmed?: boolean;
    executed?: boolean;
    executionResult?: Record<string, unknown>;
  }) {
    const { data, error } = await this.adminClient
      .from('warden_actions')
      .insert({
        session_id: params.sessionId || null,
        staff_id: params.staffId || null,
        action_type: params.actionType,
        target_type: params.targetType,
        target_id: params.targetId || null,
        user_command: params.userCommand,
        interpreted_intent: (params.interpretedIntent || {}) as Json,
        decision_reason: params.decisionReason || null,
        proposed_action: (params.proposedAction || {}) as Json,
        confirmation_required: params.confirmationRequired || false,
        confirmed: params.confirmed ?? null,
        executed: params.executed || false,
        execution_result: (params.executionResult || null) as Json,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to log warden action:', error);
      throw error;
    }
    return data;
  }
}
