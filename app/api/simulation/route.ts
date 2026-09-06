import { NextResponse } from 'next/server';
import { SimulationService } from '@/lib/services/simulation-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scenario, bedNumber, employeeNumber } = body;

    if (scenario === 'deterioration') {
      const result = await SimulationService.simulateDeterioration(bedNumber || 'Bed 8');
      return NextResponse.json(result);
    }

    if (scenario === 'staff_unavailable') {
      const result = await SimulationService.simulateStaffUnavailable(employeeNumber || 'EMP-101');
      return NextResponse.json(result);
    }

    if (scenario === 'printer_failure') {
      const result = await SimulationService.simulatePrinterFailure();
      return NextResponse.json(result);
    }

    if (scenario === 'cleaning_complete') {
      const result = await SimulationService.simulateCleaningComplete(bedNumber || 'Bed 22');
      return NextResponse.json(result);
    }

    return NextResponse.json({
      error: 'Invalid scenario. Options: deterioration, staff_unavailable, printer_failure, cleaning_complete',
    }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
