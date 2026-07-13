import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const supabase = supabaseAdmin();

  const { data: barbers } = await supabase
    .from('barbers')
    .select('id, name, image')
    .eq('active', true)
    .order('sort_order');

  const { data: services } = await supabase
    .from('services')
    .select('id, barber_id, name, duration_minutes, price')
    .eq('active', true)
    .order('sort_order');

  return NextResponse.json({ barbers: barbers ?? [], services: services ?? [] });
}
