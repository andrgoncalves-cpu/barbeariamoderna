import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const supabase = supabaseAdmin();
  const barberId = req.nextUrl.searchParams.get('barberId');

  let query = supabase.from('services').select('*').order('sort_order', { ascending: true });
  if (barberId) query = query.eq('barber_id', barberId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ services: data });
}

/** Atualiza um serviço existente (preço, duração, nome, ativo/inativo) */
export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: 'Id em falta.' }, { status: 400 });

  const supabase = supabaseAdmin();
  const { error } = await supabase.from('services').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

/** Cria um novo serviço */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.from('services').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ service: data });
}
