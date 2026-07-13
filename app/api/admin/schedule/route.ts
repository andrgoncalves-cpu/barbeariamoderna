import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const supabase = supabaseAdmin();
  const barberId = req.nextUrl.searchParams.get('barberId');

  let scheduleQuery = supabase.from('barber_schedule').select('*').order('day_of_week');
  if (barberId) scheduleQuery = scheduleQuery.eq('barber_id', barberId);
  const { data: schedule } = await scheduleQuery;

  let timeOffQuery = supabase.from('barber_time_off').select('*').order('date');
  if (barberId) timeOffQuery = timeOffQuery.eq('barber_id', barberId);
  const { data: timeOff } = await timeOffQuery;

  return NextResponse.json({ schedule, timeOff });
}

/** Atualiza o horário semanal de um dia específico de um barbeiro */
export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: 'Id em falta.' }, { status: 400 });

  const supabase = supabaseAdmin();
  const { error } = await supabase.from('barber_schedule').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

/** Adiciona uma folga pontual (ex: férias, consulta médica) */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.from('barber_time_off').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ timeOff: data });
}

/** Remove uma folga pontual */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Id em falta.' }, { status: 400 });

  const supabase = supabaseAdmin();
  const { error } = await supabase.from('barber_time_off').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
