import { createAdminClient } from '@/lib/supabase/admin';
import { EventService } from './event-service';

export class SimulationService {
  private static adminClient = createAdminClient();

  /**
   * Scenario A: Patient Deterioration while Warden is evaluating
   */
  static async simulateDeterioration(bedNumber: string = 'Bed 8') {
    const { data: bed } = await this.adminClient
      .from('beds')
      .select('id, bed_number, current_patient_id')
      .eq('bed_number', bedNumber)
      .single();

    if (!bed || !bed.current_patient_id) {
      throw new Error(`Occupied bed not found for ${bedNumber}`);
    }

    // 1. Insert deteriorating vitals
    const { data: vital } = await this.adminClient
      .from('vitals')
      .insert({
        patient_id: bed.current_patient_id,
        heart_rate: 124,
        respiratory_rate: 30,
        spo2: 88,
        systolic_bp: 165,
        diastolic_bp: 102,
        pain_score: 9,
        temperature: 38.4,
        recorded_at: new Date().toISOString(),
      })
      .select()
      .single();

    // 2. Update patient acuity to critical
    await this.adminClient
      .from('patients')
      .update({ acuity: 'critical', updated_at: new Date().toISOString() })
      .eq('id', bed.current_patient_id);

    // 3. Trigger alert
    await this.adminClient.from('system_alerts').insert({
      hospital_id: (await this.getHospitalId()),
      patient_id: bed.current_patient_id,
      alert_type: 'critical_vital',
      severity: 'critical',
      title: `URGENT: ${bed.bed_number} Rapid Deterioration`,
      description: 'SpO2 dropped to 88%, HR spiked to 124 bpm. Critical intervention needed.',
      triggered_at: new Date().toISOString(),
    });

    await EventService.logPatientEvent({
      patientId: bed.current_patient_id,
      eventType: 'vital_recorded',
      severity: 'critical',
      metadata: { hr: 124, spo2: 88, bp: '165/102', alert: 'rapid_deterioration' },
    });

    return {
      success: true,
      scenario: 'deterioration',
      bed_number: bed.bed_number,
      message: `Simulated rapid deterioration on ${bed.bed_number}. SpO2: 88%, HR: 124 bpm. Acuity is now CRITICAL.`,
    };
  }

  /**
   * Scenario B: Staff Member becomes unavailable (e.g. Priya gets urgent code)
   */
  static async simulateStaffUnavailable(employeeNumber: string = 'EMP-101') {
    const { data: staff } = await this.adminClient
      .from('staff')
      .select('id, display_name, status')
      .eq('employee_number', employeeNumber)
      .single();

    if (!staff) {
      throw new Error(`Staff member not found for ${employeeNumber}`);
    }

    const newStatus = staff.status === 'busy' ? 'unavailable' : 'busy';
    await this.adminClient
      .from('staff')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', staff.id);

    await EventService.logSystemEvent({
      eventType: 'staff_availability_changed',
      entityType: 'staff',
      entityId: staff.id,
      metadata: { staff: staff.display_name, old_status: staff.status, new_status: newStatus },
    });

    return {
      success: true,
      scenario: 'staff_status_changed',
      staff_name: staff.display_name,
      new_status: newStatus,
      message: `${staff.display_name} status updated to "${newStatus}".`,
    };
  }

  /**
   * Scenario C: Printer Paper Jam / Failure
   */
  static async simulatePrinterFailure() {
    const { data: printer } = await this.adminClient
      .from('printers')
      .select('id, name, status')
      .eq('status', 'online')
      .limit(1)
      .single();

    if (!printer) {
      throw new Error('No online printer available to fail.');
    }

    await this.adminClient
      .from('printers')
      .update({ status: 'paper_jam' })
      .eq('id', printer.id);

    await EventService.logSystemEvent({
      eventType: 'printer_offline',
      entityType: 'printer',
      entityId: printer.id,
      metadata: { printer_name: printer.name, status: 'paper_jam' },
    });

    return {
      success: true,
      scenario: 'printer_failure',
      printer_name: printer.name,
      message: `${printer.name} status updated to "paper_jam". Pending jobs now delayed.`,
    };
  }

  /**
   * Scenario D: Cleaning Job Completion (Bed becomes Available)
   */
  static async simulateCleaningComplete(bedNumber: string = 'Bed 22') {
    const { data: bed } = await this.adminClient
      .from('beds')
      .select('id, bed_number, status')
      .eq('bed_number', bedNumber)
      .single();

    if (!bed) {
      throw new Error(`Bed not found: ${bedNumber}`);
    }

    const { data: cleanJob } = await this.adminClient
      .from('cleaning_jobs')
      .select('id')
      .eq('bed_id', bed.id)
      .in('status', ['requested', 'assigned', 'in_progress'])
      .limit(1)
      .single();

    if (cleanJob) {
      // Completing the job will trigger trg_sync_bed_cleaning which updates beds.status = 'available'
      await this.adminClient
        .from('cleaning_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', cleanJob.id);
    } else {
      await this.adminClient
        .from('beds')
        .update({ status: 'available' })
        .eq('id', bed.id);
    }

    return {
      success: true,
      scenario: 'cleaning_completed',
      bed_number: bed.bed_number,
      message: `Terminal cleaning for ${bed.bed_number} marked COMPLETED. Bed is now AVAILABLE for new admissions.`,
    };
  }

  private static async getHospitalId(): Promise<string> {
    const { data } = await this.adminClient.from('hospitals').select('id').limit(1).single();
    return data?.id || '';
  }
}
