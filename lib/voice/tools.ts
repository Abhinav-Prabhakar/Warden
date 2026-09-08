import { createAdminClient } from '@/lib/supabase/admin';
import { WardService } from '@/lib/services/ward-service';

export const WARDEN_VOICE_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_warden_room_status',
      description: 'Check the real-time operational status of any floor or warden room. Returns occupancy, critical patients, active medical tasks, cleaning jobs, and overall floor state.',
      parameters: {
        type: 'object',
        properties: {
          floor_number: {
            type: 'integer',
            description: 'The hospital floor number to inspect (e.g. 4, 5, 6, 7, 8). Defaults to 7.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_bed_status',
      description: 'Check clinical details of a specific bed on any floor. Returns the patient name, acuity, medical condition, latest vitals (heart rate, blood pressure, oxygen saturation, temperature), and active tasks.',
      parameters: {
        type: 'object',
        properties: {
          bed_number: {
            type: 'string',
            description: "The bed name or number (e.g. 'Bed 1', 'Bed 2', 'Bed 3', 'Bed 7').",
          },
          floor_number: {
            type: 'integer',
            description: 'The floor number where the bed is located (e.g. 7). Defaults to 7.',
          },
        },
        required: ['bed_number'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_staff_roster',
      description: 'Query available clinical staff (doctors, nurses, porters, pharmacists, ward coordinators) on duty, their availability status, phone extension, and specializations.',
      parameters: {
        type: 'object',
        properties: {
          role: {
            type: 'string',
            description: "Optional filter by role: 'doctor', 'nurse', 'porter', 'warden', 'pharmacist', or 'all'.",
          },
          status: {
            type: 'string',
            description: "Optional filter by availability status: 'active', 'busy', 'on_break', 'off_duty'.",
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_supabase_table',
      description: 'General query tool to inspect any table in the Supabase hospital database.',
      parameters: {
        type: 'object',
        properties: {
          table: {
            type: 'string',
            description: 'The table to query.',
            enum: ['beds', 'patients', 'vitals', 'tasks', 'staff', 'cleaning_jobs', 'discharge_plans', 'medications', 'system_alerts', 'rooms', 'wards'],
          },
          filter_column: {
            type: 'string',
            description: 'Optional column name to filter by (e.g. status, acuity, priority).',
          },
          filter_value: {
            type: 'string',
            description: 'Value to match for filter_column.',
          },
          limit: {
            type: 'integer',
            description: 'Maximum rows to retrieve (default 5).',
          },
        },
        required: ['table'],
      },
    },
  },
];

export async function executeVoiceTool(name: string, args: Record<string, any>): Promise<any> {
  const admin = createAdminClient();

  try {
    if (name === 'get_warden_room_status') {
      const floor = typeof args.floor_number === 'number' ? args.floor_number : 7;
      
      const { data: rawBeds } = await admin
        .from('beds')
        .select(`
          bed_number,
          status,
          room:rooms!beds_room_id_fkey!inner (floor_number),
          patient:patients!beds_current_patient_id_fkey (
            first_name,
            last_name,
            acuity,
            patient_conditions (name)
          )
        `)
        .eq('room.floor_number', floor)
        .order('bed_number', { ascending: true });

      const beds = rawBeds || [];
      const critical = beds.filter((b: any) => b.patient?.acuity === 'critical');
      const cleaning = beds.filter((b: any) => b.status === 'cleaning');
      const occupied = beds.filter((b: any) => b.patient != null);
      const ready = beds.filter((b: any) => b.status === 'available');

      return {
        floor_number: floor,
        total_beds: beds.length,
        occupied_count: occupied.length,
        ready_beds: ready.map((b: any) => b.bed_number),
        critical_alerts: critical.map((b: any) => ({
          bed: b.bed_number,
          patient: `${b.patient?.first_name} ${b.patient?.last_name}`,
          condition: b.patient?.patient_conditions?.[0]?.name || 'Critical',
          urgency: 'STAT DOCTOR REVIEW',
        })),
        cleaning_jobs: cleaning.map((b: any) => b.bed_number),
        summary: `Floor ${floor} has ${occupied.length} of ${beds.length} beds occupied. ${critical.length > 0 ? `${critical.length} critical patient in ${critical.map((c: any) => c.bed_number).join(', ')}.` : 'All patients stable.'} ${cleaning.length > 0 ? `${cleaning.length} bed undergoing cleaning.` : ''}`,
      };
    }

    if (name === 'get_bed_status') {
      const floor = typeof args.floor_number === 'number' ? args.floor_number : 7;
      const bedNumber = args.bed_number || 'Bed 1';
      const drilldown = await WardService.getBedDrilldown(bedNumber, floor);

      const pat = drilldown.bed?.patient;
      const vitals = drilldown.vitals?.[0];
      const tasks = drilldown.tasks || [];

      return {
        bed_number: drilldown.bed?.bed_number || bedNumber,
        floor_number: floor,
        status: drilldown.bed?.status || 'available',
        patient: pat
          ? {
              name: `${pat.first_name} ${pat.last_name}`,
              mrn: pat.medical_record_number,
              blood_type: pat.blood_type,
              acuity: pat.acuity,
              condition: pat.patient_conditions?.[0]?.name || 'Under evaluation',
              allergies: (pat.patient_allergies || []).map((a: any) => a.allergen),
            }
          : null,
        vitals: vitals
          ? {
              heart_rate: `${vitals.heart_rate} bpm`,
              blood_pressure: `${vitals.systolic_bp}/${vitals.diastolic_bp} mmHg`,
              oxygen_saturation: `${vitals.spo2}%`,
              temperature: `${vitals.temperature}°C`,
            }
          : 'No recent vitals recorded',
        active_tasks: tasks.slice(0, 3).map((t: any) => ({
          title: t.title,
          priority: t.priority,
          status: t.status,
        })),
      };
    }

    if (name === 'get_staff_roster') {
      let query = admin
        .from('staff')
        .select(`
          display_name,
          role,
          phone,
          status,
          is_on_duty,
          skills:staff_skills (skill_code)
        `)
        .order('is_on_duty', { ascending: false });

      if (args.role && args.role !== 'all') {
        query = query.eq('role', args.role);
      }
      if (args.status) {
        query = query.eq('status', args.status);
      }

      const { data: staff } = await query.limit(8);
      return (staff || []).map((s: any) => ({
        name: s.display_name,
        role: s.role,
        status: s.status,
        on_duty: s.is_on_duty,
        phone: s.phone,
        specializations: (s.skills || []).map((sk: any) => sk.skill_code),
      }));
    }

    if (name === 'query_supabase_table') {
      const table = args.table;
      let query = (admin as any).from(table).select('*').limit(args.limit || 5);

      if (args.filter_column && args.filter_value) {
        query = query.eq(args.filter_column, args.filter_value);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }

    return { error: `Unknown tool: ${name}` };
  } catch (err: any) {
    console.error(`Tool execution error for ${name}:`, err);
    return { error: err.message };
  }
}
