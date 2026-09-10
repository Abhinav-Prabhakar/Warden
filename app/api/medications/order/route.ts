import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'This legacy order endpoint is disabled. Create a patient-bound request through /api/medication-requests.',
      code: 'PATIENT_CONTEXT_REQUIRED',
    },
    { status: 410 },
  );
}
