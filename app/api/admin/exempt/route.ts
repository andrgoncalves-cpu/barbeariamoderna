import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customers: data });
}

/** Define manualmente o override de um telefone: 'always_exempt' | 'always_pay' | 'none' */
export async function POST(req: NextRequest) {
  const { phone, override, name } = await req.json();
  if (!phone || !override) {
    return NextResponse.json({ error: 'Dados em falta.' }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  const { data: existing } = await supabase.from('customers').select('phone').eq('phone', phone).single();

  if (existing) {
    await supabase.from('customers').update({ override }).eq('phone', phone);
  } else {
    await supabase.from('customers').insert({ phone, name: name ?? '', override });
  }

  return NextResponse.json({ success: true });
}
