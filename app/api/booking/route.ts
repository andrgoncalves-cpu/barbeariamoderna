import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAvailableSlots } from '@/lib/availability';
import { getOrCreateCustomer, isPhoneExempt } from '@/lib/customers';
import { createGoogleEvent } from '@/lib/google-calendar';
import { sendBookingConfirmationEmail, sendPendingPaymentEmail } from '@/lib/email';

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const mm = (total % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatDatePT(dateISO: string): string {
  const [y, m, d] = dateISO.split('-');
  return `${d}/${m}/${y}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { barberId, serviceId, date, time, name, phone, email } = body;

  if (!barberId || !serviceId || !date || !time || !name || !phone || !email) {
    return NextResponse.json({ error: 'Dados em falta.' }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  // Confirma que o horário ainda está livre (evita colisão de última hora)
  const freeSlots = await getAvailableSlots({ barberId, serviceId, dateISO: date });
  if (!freeSlots.includes(time)) {
    return NextResponse.json(
      { error: 'Este horário deixou de estar disponível. Escolha outro.' },
      { status: 409 }
    );
  }

  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .single();
  const { data: barber } = await supabase.from('barbers').select('*').eq('id', barberId).single();

  if (!service || !barber) {
    return NextResponse.json({ error: 'Serviço ou profissional inválido.' }, { status: 400 });
  }

  const endTime = addMinutes(time, service.duration_minutes);

  await getOrCreateCustomer(phone, name, email);
  const exempt = await isPhoneExempt(phone);

  const { data: settings } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['prepayment_amount', 'prepayment_link', 'prepayment_hold_minutes']);
  const settingsMap = Object.fromEntries(
    (settings ?? []).map((s: { key: string; value: string }) => [s.key, s.value])
  );
  const prepaymentAmount = Number(settingsMap.prepayment_amount ?? 2);
  const prepaymentLink = settingsMap.prepayment_link ?? '';
  const holdMinutes = Number(settingsMap.prepayment_hold_minutes ?? 15);

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      barber_id: barberId,
      service_id: serviceId,
      customer_phone: phone,
      customer_name: name,
      customer_email: email,
      date,
      start_time: time,
      end_time: endTime,
      price: service.price,
      requires_prepayment: !exempt,
      payment_status: exempt ? 'not_required' : 'pending',
      status: exempt ? 'confirmed' : 'pending_payment',
      source: 'site',
    })
    .select()
    .single();

  if (error || !booking) {
    console.error('Erro ao criar marcação:', error);
    return NextResponse.json({ error: 'Não foi possível criar a marcação.' }, { status: 500 });
  }

  const cancelUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/cancelar?token=${booking.cancel_token}`;

  if (exempt) {
    try {
      const eventId = await createGoogleEvent({
        barberId,
        summary: `${service.name} — ${name}`,
        description: `Telefone: ${phone}\nServiço: ${service.name}\nPreço: ${service.price}€`,
        dateISO: date,
        startTime: time,
        endTime,
      });
      if (eventId) {
        await supabase.from('bookings').update({ google_event_id: eventId }).eq('id', booking.id);
      }
    } catch (err) {
      console.error('Erro ao criar evento no Google Calendar (marcação já foi criada):', err);
    }

    try {
      await sendBookingConfirmationEmail({
        to: email,
        customerName: name,
        barberName: barber.name,
        serviceName: service.name,
        dateFormatted: formatDatePT(date),
        time,
        price: service.price,
        cancelUrl,
      });
    } catch (err) {
      console.error('Erro ao enviar email de confirmação (marcação já foi criada):', err);
    }
  } else {
    try {
      await sendPendingPaymentEmail({
        to: email,
        customerName: name,
        amount: prepaymentAmount,
        paymentLink: prepaymentLink,
        holdMinutes,
      });
    } catch (err) {
      console.error('Erro ao enviar email de pré-pagamento (marcação já foi criada):', err);
    }
  }

  return NextResponse.json({
    booking: {
      id: booking.id,
      requiresPrepayment: !exempt,
      prepaymentAmount: exempt ? 0 : prepaymentAmount,
      prepaymentLink: exempt ? null : prepaymentLink,
      holdMinutes: exempt ? null : holdMinutes,
    },
  });
}
