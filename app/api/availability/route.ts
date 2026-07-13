import { NextRequest, NextResponse } from 'next/server';
import { getAvailableSlots } from '@/lib/availability';

export async function GET(req: NextRequest) {
  const barberId = req.nextUrl.searchParams.get('barberId');
  const serviceId = req.nextUrl.searchParams.get('serviceId');
  const date = req.nextUrl.searchParams.get('date');

  if (!barberId || !serviceId || !date) {
    return NextResponse.json(
      { error: 'Parâmetros em falta (barberId, serviceId, date)' },
      { status: 400 }
    );
  }

  try {
    const slots = await getAvailableSlots({ barberId, serviceId, dateISO: date });
    return NextResponse.json({ slots });
  } catch (err) {
    console.error('Erro em /api/availability:', err);
    return NextResponse.json({ error: 'Erro ao calcular disponibilidade' }, { status: 500 });
  }
}
