import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const supabase = supabaseAdmin();
  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');
  const barberId = req.nextUrl.searchParams.get('barberId');
  // Por defeito conta apenas marcações efetivamente cumpridas.
  const includeStatuses = req.nextUrl.searchParams.get('statuses')?.split(',') ?? ['completed'];

  let query = supabase
    .from('bookings')
    .select('*, services(name), barbers(name)')
    .in('status', includeStatuses);

  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);
  if (barberId) query = query.eq('barber_id', barberId);

  const { data: bookings, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = bookings ?? [];

  const totalCount = rows.length;
  const totalRevenue = rows.reduce((sum: number, b: { price: number }) => sum + Number(b.price), 0);

  const byService: Record<string, { count: number; revenue: number }> = {};
  const byBarber: Record<string, { count: number; revenue: number }> = {};
  const byDay: Record<string, { count: number; revenue: number }> = {};

  for (const b of rows) {
    const serviceName = b.services?.name ?? '—';
    const barberName = b.barbers?.name ?? '—';

    byService[serviceName] = byService[serviceName] ?? { count: 0, revenue: 0 };
    byService[serviceName].count += 1;
    byService[serviceName].revenue += Number(b.price);

    byBarber[barberName] = byBarber[barberName] ?? { count: 0, revenue: 0 };
    byBarber[barberName].count += 1;
    byBarber[barberName].revenue += Number(b.price);

    byDay[b.date] = byDay[b.date] ?? { count: 0, revenue: 0 };
    byDay[b.date].count += 1;
    byDay[b.date].revenue += Number(b.price);
  }

  return NextResponse.json({
    totalCount,
    totalRevenue,
    byService,
    byBarber,
    byDay,
  });
}
