import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = supabaseAdmin();

    const { data: barbers, error: barbersError } = await supabase
      .from('barbers')
      .select('id, name, image')
      .eq('active', true)
      .order('sort_order');

    if (barbersError) {
      console.error('Erro ao buscar barbers:', barbersError);
      return NextResponse.json({ error: `Erro barbers: ${barbersError.message}` }, { status: 500 });
    }

    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, barber_id, name, duration_minutes, price')
      .eq('active', true)
      .order('sort_order');

    if (servicesError) {
      console.error('Erro ao buscar services:', servicesError);
      return NextResponse.json({ error: `Erro services: ${servicesError.message}` }, { status: 500 });
    }

    return NextResponse.json({ barbers: barbers ?? [], services: services ?? [] });
  } catch (err) {
    console.error('Erro geral em /api/public/data:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
