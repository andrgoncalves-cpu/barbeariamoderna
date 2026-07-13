import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getOrCreateCustomer, isPhoneExempt } from '@/lib/customers';
import { createGoogleEvent } from '@/lib/google-calendar';

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60).toString().padStart(2, '0');
  const mm = (total % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export async function GET(req: NextRequest) {
  const supabase = supabaseAdmin();
  const dateFrom = req.nextUrl.searchParams.get('from');
  const dateTo = req.nextUrl.searchParams.get('to');
  const barberId = req.nextUrl.searchParams.get('barberId');

  let query = supabase
    .from('bookings')
    .select('*, services(name, duration_minutes), barbers(name)')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (dateFrom) query = query.gte('date', dateFrom);
  if (dateTo) query = query.lte('date', dateTo);
  if (barberId) query = query.eq('barber_id', barberId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ bookings: data });
}

/** Marcação manual — cliente presente na barbearia, sem passar pelo site. */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { barberId, serviceId, date, time, name, phone, email } = body;

  if (!barberId || !serviceId || !date || !time || !name || !phone) {
    return NextResponse.json({ error: 'Dados em falta.' }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data: service } = await supabase.from('services').select('*').eq('id', serviceId).single();
  if (!service) return NextResponse.json({ error: 'Serviço inválido.' }, { status: 400 });

  const endTime = addMinutes(time, service.duration_minutes);
  const finalEmail = email || 'sem-email@barbearia.local';

  await getOrCreateCustomer(phone, name, finalEmail);

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      barber_id: barberId,
      service_id: serviceId,
      customer_phone: phone,
      customer_name: name,
      customer_email: finalEmail,
      date,
      start_time: time,
      end_time: endTime,
      price: service.price,
      requires_prepayment: false,
      payment_status: 'not_required',
      status: 'confirmed',
      source: 'manual',
    })
    .select()
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: 'Não foi possível criar a marcação.' }, { status: 500 });
  }

  const eventId = await createGoogleEvent({
    barberId,
    summary: `${service.name} — ${name} (manual)`,
    description: `Telefone: ${phone}`,
    dateISO: date,
    startTime: time,
    endTime,
  });
  if (eventId) {
    await supabase.from('bookings').update({ google_event_id: eventId }).eq('id', booking.id);
  }

  return NextResponse.json({ booking });
}
