import { NextResponse } from 'next/server';
import { OrchestratorService } from '@/lib/services/orchestrator-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workflow, bedId, patientId, coordinatorStaffId } = body;

    if (workflow === 'prepare_bed') {
      if (!bedId) return NextResponse.json({ error: 'bedId is required' }, { status: 400 });
      const result = await OrchestratorService.orchestratePrepareBed({
        bedId,
        coordinatorStaffId,
      });
      return NextResponse.json(result);
    }

    if (workflow === 'discharge_patient') {
      if (!patientId) return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
      const result = await OrchestratorService.orchestrateDischarge({
        patientId,
        coordinatorStaffId: coordinatorStaffId || 'EMP-401',
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: `Unknown workflow: ${workflow}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
