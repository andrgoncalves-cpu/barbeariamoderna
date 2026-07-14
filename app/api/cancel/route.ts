import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { deleteGoogleEvent } from '@/lib/google-calendar';
import { sendCancellationEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Token em falta.' }, { status: 400 });

  const supabase = supabaseAdmin();
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, services(name), barbers(name)')
    .eq('cancel_token', token)
    .single();

  if (!booking) return NextResponse.json({ error: 'Marcação não encontrada.' }, { status: 404 });

  const { data: setting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'free_cancel_hours')
    .single();
  const freeCancelHours = Number(setting?.value ?? 6);

  const bookingDateTime = new Date(`${booking.date}T${booking.start_time}`);
  const hoursUntil = (bookingDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

  return NextResponse.json({
    booking: {
      id: booking.id,
      status: booking.status,
      date: booking.date,
      time: booking.start_time,
      serviceName: booking.services?.name,
      barberName: booking.barbers?.name,
      price: booking.price,
      requiresPrepayment: booking.requires_prepayment,
    },
    withinFreeCancelWindow: hoursUntil >= freeCancelHours,
    freeCancelHours,
  });
}

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: 'Token em falta.' }, { status: 400 });

  const supabase = supabaseAdmin();
  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('cancel_token', token)
    .single();

  if (!booking) return NextResponse.json({ error: 'Marcação não encontrada.' }, { status: 404 });
  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'Esta marcação já estava cancelada.' }, { status: 400 });
  }

  await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);

  if (booking.google_event_id) {
    await deleteGoogleEvent(booking.barber_id, booking.google_event_id);
  }

  const [y, m, d] = booking.date.split('-');
  try {
    await sendCancellationEmail({
      to: booking.customer_email,
      customerName: booking.customer_name,
      dateFormatted: `${d}/${m}/${y}`,
      time: booking.start_time,
    });
  } catch (err) {
    console.error('Erro ao enviar email de cancelamento:', err);
  }

  return NextResponse.json({ success: true });
}
