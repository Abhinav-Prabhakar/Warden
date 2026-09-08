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

    const shelfItems = (meds || []).map((m: any) => {
      const form = String(m.form || 'tablet').toLowerCase();
      const haystack = `${m.name} ${m.generic_name || ''}`.toLowerCase();
      const packageType = form.includes('liquid') || form.includes('syrup') || form.includes('solution')
        ? 'bottle'
        : form.includes('capsule') || form.includes('tablet')
        ? 'box'
        : form.includes('strip') || form.includes('blister')
        ? 'strip'
        : 'container';
      const category = /amoxic|cillin|antibiotic/.test(haystack) ? 'Antibiotics'
        : /ibuprofen|paracetamol|acetaminophen|pain/.test(haystack) ? 'Pain & Inflammation'
        : /cetirizine|diphenhydramine|benadryl|allerg/.test(haystack) ? 'Allergy & Respiratory'
        : 'General Therapeutics';
      const colorType = category === 'Antibiotics' ? 'green'
        : category === 'Pain & Inflammation' ? 'orange'
        : category === 'Allergy & Respiratory' ? 'magenta'
        : 'cyan';

      return {
        id: m.id,
        name: m.name,
        genericName: m.generic_name,
        strength: m.strength,
        form: m.form,
        category,
        indication: [`Active ingredient: ${m.generic_name || m.name}`, `Dosage form: ${m.form || 'Tablet'}`, `Strength: ${m.strength || 'Standard'}`],
        packageType,
        colorType,
      };
    });

    return NextResponse.json({ items: shelfItems });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
