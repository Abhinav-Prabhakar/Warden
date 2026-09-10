import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('nutrition_inventory')
      .select('id, name, category, left_pct, top_pct, width_pct, height_pct, calories, protein, carbs, dietary, location, stock')
      .eq('active', true)
      .order('name');
    if (error) throw error;

    return NextResponse.json({
      items: (data || []).map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        leftPct: item.left_pct,
        topPct: item.top_pct,
        widthPct: item.width_pct,
        heightPct: item.height_pct,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        dietary: item.dietary || [],
        location: item.location,
        stock: item.stock,
      })),
      source: 'supabase',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nutrition inventory unavailable';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
