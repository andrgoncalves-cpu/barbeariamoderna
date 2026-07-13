import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createGoogleEvent, deleteGoogleEvent } from '@/lib/google-calendar';
import { markBookingCompleted, markNoShow } from '@/lib/customers';
import { sendBookingConfirmationEmail } from '@/lib/email';

function formatDatePT(dateISO: string): string {
  const [y, m, d] = dateISO.split('-');
  return `${d}/${m}/${y}`;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const supabase = supabaseAdmin();

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, services(name), barbers(name)')
    .eq('id', id)
    .single();

  if (!booking) return NextResponse.json({ error: 'Marcação não encontrada.' }, { status: 404 });

  // ---- Confirmar pagamento recebido (Revolut/MB WAY) ----
  if (body.action === 'confirm-payment') {
    await supabase
      .from('bookings')
      .update({ payment_status: 'confirmed', status: 'confirmed' })
      .eq('id', id);

    const eventId = await createGoogleEvent({
      barberId: booking.barber_id,
      summary: `${booking.services?.name} — ${booking.customer_name}`,
      description: `Telefone: ${booking.customer_phone}\nPreço: ${booking.price}€`,
      dateISO: booking.date,
      startTime: booking.start_time,
      endTime: booking.end_time,
    });
    if (eventId) {
      await supabase.from('bookings').update({ google_event_id: eventId }).eq('id', id);
    }

    await sendBookingConfirmationEmail({
      to: booking.customer_email,
      customerName: booking.customer_name,
      barberName: booking.barbers?.name ?? '',
      serviceName: booking.services?.name ?? '',
      dateFormatted: formatDatePT(booking.date),
      time: booking.start_time,
      price: booking.price,
      cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/cancelar?token=${booking.cancel_token}`,
    });

    return NextResponse.json({ success: true });
  }

  // ---- Marcar estado final: concluída / falta / cancelada ----
  if (body.action === 'status') {
    const newStatus = body.status as 'completed' | 'no_show' | 'cancelled';

    await supabase.from('bookings').update({ status: newStatus }).eq('id', id);

    if (newStatus === 'completed') {
      await markBookingCompleted(booking.customer_phone);
    }
    if (newStatus === 'no_show') {
      await markNoShow(booking.customer_phone);
    }
    if ((newStatus === 'cancelled' || newStatus === 'no_show') && booking.google_event_id) {
      await deleteGoogleEvent(booking.barber_id, booking.google_event_id);
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
}
