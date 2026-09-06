import { createAdminClient } from '@/lib/supabase/admin';
import { PrintJobStatus, Json } from '@/types/database';
import { EventService } from './event-service';

export class PrintService {
  private static adminClient = createAdminClient();

  /**
   * Submit a new document to the Cloud Printer Queue
   */
  static async queuePrintJob(params: {
    printerId?: string;
    hospitalId: string;
    requestedBy: string;
    patientId?: string | null;
    taskId?: string | null;
    documentType: string;
    documentTitle: string;
    storagePath?: string;
    copies?: number;
    duplex?: boolean;
    color?: boolean;
    priority?: number;
  }) {
    // 1. Select printer (default to online ward printer if none specified)
    let printerId = params.printerId;
    if (!printerId) {
      const { data: defaultPrinter } = await this.adminClient
        .from('printers')
        .select('id')
        .eq('hospital_id', params.hospitalId)
        .eq('status', 'online')
        .limit(1)
        .single();

      if (!defaultPrinter) {
        throw new Error('No online printer found in this ward/hospital.');
      }
      printerId = defaultPrinter.id;
    }

    // 2. Prevent accidental duplicate print jobs within 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: existingDuplicate } = await this.adminClient
      .from('print_jobs')
      .select('id, status')
      .eq('printer_id', printerId)
      .eq('document_title', params.documentTitle)
      .gte('queued_at', twoMinutesAgo)
      .in('status', ['queued', 'processing', 'printing'])
      .limit(1);

    if (existingDuplicate && existingDuplicate.length > 0) {
      return {
        job: existingDuplicate[0],
        duplicatePrevented: true,
        message: `A print job for "${params.documentTitle}" is already active in the queue.`,
      };
    }

    // 3. Insert print job
    const { data: job, error } = await this.adminClient
      .from('print_jobs')
      .insert({
        printer_id: printerId,
        requested_by: params.requestedBy,
        patient_id: params.patientId || null,
        task_id: params.taskId || null,
        document_type: params.documentType,
        document_title: params.documentTitle,
        storage_path: params.storagePath || null,
        copies: params.copies ?? 1,
        duplex: params.duplex ?? true,
        color: params.color ?? false,
        priority: params.priority ?? 3,
        status: 'queued',
        queued_at: new Date().toISOString(),
      })
      .select('*, printer:printers(name, status)')
      .single();

    if (error || !job) {
      throw new Error(`Failed to queue print job: ${error?.message}`);
    }

    // Log event
    if (params.patientId) {
      await EventService.logPatientEvent({
        patientId: params.patientId,
        eventType: 'print_job_submitted',
        actorId: params.requestedBy,
        metadata: { jobId: job.id, title: params.documentTitle },
      });
    }

    await EventService.logSystemEvent({
      eventType: 'print_job_queued',
      entityType: 'printer',
      entityId: printerId,
      actorId: params.requestedBy,
      metadata: { jobId: job.id, title: params.documentTitle },
    });

    return { job, duplicatePrevented: false };
  }

  /**
   * Retrieve active print jobs with queue position
   */
  static async getPrintQueue(printerId?: string) {
    let query = this.adminClient
      .from('print_jobs')
      .select(`
        *,
        printer:printers(id, name, status, location_node_id),
        staff:staff!print_jobs_requested_by_fkey(display_name),
        patient:patients!print_jobs_patient_id_fkey(first_name, last_name, medical_record_number)
      `)
      .order('priority', { ascending: true })
      .order('queued_at', { ascending: true });

    if (printerId) {
      query = query.eq('printer_id', printerId);
    }

    const { data: jobs, error } = await query;
    if (error) throw error;

    // Calculate queue positions
    let position = 1;
    return (jobs || []).map((j: any) => {
      const isPending = j.status === 'queued' || j.status === 'processing' || j.status === 'printing';
      return {
        ...j,
        queue_position: isPending ? position++ : null,
      };
    });
  }

  /**
   * Cancel print job
   */
  static async cancelPrintJob(jobId: string, cancelledBy?: string) {
    const { data: job, error } = await this.adminClient
      .from('print_jobs')
      .update({
        status: 'cancelled',
      })
      .eq('id', jobId)
      .select()
      .single();

    if (error || !job) {
      throw new Error(`Failed to cancel print job: ${error?.message}`);
    }

    await EventService.logSystemEvent({
      eventType: 'print_job_cancelled',
      entityType: 'print_job',
      entityId: jobId,
      actorId: cancelledBy || null,
      metadata: { title: job.document_title },
    });

    return job;
  }

  /**
   * Retry failed print job
   */
  static async retryPrintJob(jobId: string) {
    const { data: job, error } = await this.adminClient
      .from('print_jobs')
      .update({
        status: 'queued',
        error_message: null,
        attempt_count: 0,
        queued_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .select()
      .single();

    if (error || !job) {
      throw new Error(`Failed to retry print job: ${error?.message}`);
    }

    return job;
  }
}
