import { NextResponse } from 'next/server';
import { PrintService } from '@/lib/services/print-service';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const printerId = searchParams.get('printerId') || undefined;

    const queue = await PrintService.getPrintQueue(printerId);
    return NextResponse.json(queue);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.documentTitle || !body.documentType || !body.requestedBy) {
      return NextResponse.json(
        { error: 'documentTitle, documentType, and requestedBy are required' },
        { status: 400 }
      );
    }

    let hospitalId = body.hospitalId;
    if (!hospitalId) {
      const admin = createAdminClient();
      const { data } = await admin.from('hospitals').select('id').limit(1).single();
      hospitalId = data?.id;
    }

    const result = await PrintService.queuePrintJob({
      printerId: body.printerId,
      hospitalId,
      requestedBy: body.requestedBy,
      patientId: body.patientId,
      taskId: body.taskId,
      documentType: body.documentType,
      documentTitle: body.documentTitle,
      storagePath: body.storagePath,
      copies: body.copies,
      duplex: body.duplex,
      color: body.color,
      priority: body.priority,
    });

    return NextResponse.json(result, { status: result.duplicatePrevented ? 200 : 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
