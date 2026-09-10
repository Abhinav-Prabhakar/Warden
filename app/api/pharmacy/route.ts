import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// Shelf item layout mapping accurately to 3D shelf visual render
export const SHELF_POSITIONS: Record<
  string,
  {
    leftPct: number;
    topPct: number;
    widthPct: number;
    heightPct: number;
    colorType: 'cyan' | 'magenta' | 'orange' | 'green';
    category: string;
    indications: string[];
    isBottleShape?: boolean;
  }
> = {
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

export const DEFAULT_SHELF_ITEMS = Object.entries(SHELF_POSITIONS).map(([name, pos], idx) => ({
  id: `shelf-med-${idx + 1}`,
  name,
  category: pos.category,
  indication: pos.indications,
  colorType: pos.colorType,
  leftPct: pos.leftPct,
  topPct: pos.topPct,
  widthPct: pos.widthPct,
  heightPct: pos.heightPct,
  isBottleShape: pos.isBottleShape,
}));

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: meds, error } = await admin
      .from('medications')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Pharmacy medications fetch error:', error);
      return NextResponse.json({ items: DEFAULT_SHELF_ITEMS });
    }

    const items = Object.entries(SHELF_POSITIONS).map(([name, pos], idx) => {
      const dbMatch = (meds || []).find(
        (m: any) =>
          m.name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(m.name.toLowerCase())
      );

      return {
        id: dbMatch?.id || `shelf-med-${idx + 1}`,
        name: dbMatch?.name || name,
        genericName: dbMatch?.generic_name || null,
        strength: dbMatch?.strength || null,
        form: dbMatch?.form || null,
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

    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ items: DEFAULT_SHELF_ITEMS });
  }
}
