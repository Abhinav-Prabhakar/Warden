import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: meds, error } = await admin
      .from('medications')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Pharmacy medications fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Shelf item layout mapping to 3D shelf visual render
    const shelfPositions: Record<string, { leftPct: number; topPct: number; widthPct: number; heightPct: number; colorType: 'cyan' | 'magenta' | 'orange' | 'green'; category: string; indications: string[]; isBottleShape?: boolean }> = {
      'Cetirizine 10mg': {
        leftPct: 19.63,
        topPct: 35.89,
        widthPct: 3.61,
        heightPct: 8.5,
        colorType: 'cyan',
        category: 'Allergy Relief',
        indications: [
          'Relieves seasonal allergy symptoms',
          'Fast acting non-drowsy formulation',
          'Treats itchy eyes and runny nose',
        ],
      },
      'Benadryl': {
        leftPct: 37.3,
        topPct: 51.56,
        widthPct: 2.73,
        heightPct: 8.5,
        colorType: 'magenta',
        category: 'Cough & Cold',
        indications: [
          'Loosens thick mucus, relieves chest congestion',
          'Calms throat irritation, persistent coughs',
          'Relieves runny nose, sneezing, watery eyes',
        ],
        isBottleShape: true,
      },
      'Ibuprofen 400mg': {
        leftPct: 56.93,
        topPct: 52.0,
        widthPct: 4.3,
        heightPct: 2.34,
        colorType: 'orange',
        category: 'Anti-Inflammatory',
        indications: [
          'Provides relief from acute pain and fever',
          'Reduces joint inflammation & swelling',
          'Prescribed post-op analgesic support',
        ],
      },
      'Amoxicillin 500mg': {
        leftPct: 11.82,
        topPct: 81.3,
        widthPct: 4.88,
        heightPct: 7.76,
        colorType: 'green',
        category: 'Antibiotics',
        indications: [
          'Broad-spectrum bacterial infection control',
          'Respiratory and urinary tract treatment',
          'Completed course verification required',
        ],
      },
    };

    const shelfItems = (meds || []).map((m: any) => {
      const pos = shelfPositions[m.name] || {
        leftPct: 25,
        topPct: 40,
        widthPct: 4,
        heightPct: 6,
        colorType: 'cyan' as const,
        category: 'General Therapeutics',
        indications: [`Active pharmaceutical ingredient: ${m.generic_name || m.name}`, `Dosage form: ${m.form || 'Tablet'}`, `Strength: ${m.strength || 'Standard'}`],
      };

      return {
        id: m.id,
        name: m.name,
        genericName: m.generic_name,
        strength: m.strength,
        form: m.form,
        category: pos.category,
        indication: pos.indications,
        colorType: pos.colorType,
        leftPct: pos.leftPct,
        topPct: pos.topPct,
        widthPct: pos.widthPct,
        heightPct: pos.heightPct,
        isBottleShape: pos.isBottleShape,
      };
    });

    return NextResponse.json(shelfItems);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
