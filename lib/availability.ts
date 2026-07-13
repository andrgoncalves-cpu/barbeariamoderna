import { supabaseAdmin } from './supabase';
import { getGoogleBusyIntervals } from './google-calendar';

const GRID_MINUTES = 15;
const ORPHAN_GAP_MINUTES = 15; // gap "preso" que a regra rígida esconde

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

interface Interval {
  startMinutes: number;
  endMinutes: number;
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
}

export async function getAvailableSlots(params: {
  barberId: string;
  serviceId: string;
  dateISO: string; // 'YYYY-MM-DD'
}): Promise<string[]> {
  const { barberId, serviceId, dateISO } = params;
  const supabase = supabaseAdmin();

  const date = new Date(`${dateISO}T00:00:00`);
  const dayOfWeek = date.getDay();

  // 1. Horário do barbeiro nesse dia da semana
  const { data: schedule } = await supabase
    .from('barber_schedule')
    .select('*')
    .eq('barber_id', barberId)
    .eq('day_of_week', dayOfWeek)
    .single();

  if (!schedule || !schedule.works || !schedule.start_time || !schedule.end_time) {
    return [];
  }

  // 2. Folga pontual nesse dia específico
  const { data: timeOff } = await supabase
    .from('barber_time_off')
    .select('*')
    .eq('barber_id', barberId)
    .eq('date', dateISO);

  if (timeOff?.some((t: { start_time: string | null; end_time: string | null }) => !t.start_time || !t.end_time)) {
    return []; // folga o dia inteiro
  }

  // 3. Duração do serviço pedido
  const { data: service } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', serviceId)
    .single();

  if (!service) return [];
  const duration = service.duration_minutes as number;

  // 4. Marcações já existentes (ignora pending_payment expirados)
  const { data: holdSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'prepayment_hold_minutes')
    .single();
  const holdMinutes = Number(holdSetting?.value ?? 15);

  const { data: bookings } = await supabase
    .from('bookings')
    .select('start_time, end_time, status, created_at')
    .eq('barber_id', barberId)
    .eq('date', dateISO)
    .in('status', ['confirmed', 'pending_payment', 'completed']);

  const now = new Date();
  const busy: Interval[] = [];

  for (const b of bookings ?? []) {
    if (b.status === 'pending_payment') {
      const createdAt = new Date(b.created_at as string);
      const expiresAt = new Date(createdAt.getTime() + holdMinutes * 60000);
      if (now > expiresAt) continue; // hold expirado, não conta como ocupado
    }
    busy.push({
      startMinutes: timeToMinutes(b.start_time as string),
      endMinutes: timeToMinutes(b.end_time as string),
    });
  }

  // 5. Folgas pontuais parciais
  for (const t of timeOff ?? []) {
    if (t.start_time && t.end_time) {
      busy.push({
        startMinutes: timeToMinutes(t.start_time),
        endMinutes: timeToMinutes(t.end_time),
      });
    }
  }

  // 6. Google Calendar (bloqueios manuais feitos diretamente lá)
  const gcalBusy = await getGoogleBusyIntervals(barberId, dateISO);
  busy.push(...gcalBusy);

  busy.sort((a, b) => a.startMinutes - b.startMinutes);

  // 7. Segmentos abertos do dia (antes/depois do almoço)
  const dayStart = timeToMinutes(schedule.start_time);
  const dayEnd = timeToMinutes(schedule.end_time);
  const segments: Interval[] = [];

  if (schedule.lunch_start && schedule.lunch_end) {
    segments.push({ startMinutes: dayStart, endMinutes: timeToMinutes(schedule.lunch_start) });
    segments.push({ startMinutes: timeToMinutes(schedule.lunch_end), endMinutes: dayEnd });
  } else {
    segments.push({ startMinutes: dayStart, endMinutes: dayEnd });
  }

  const isToday = dateISO === now.toISOString().slice(0, 10);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const results: string[] = [];

  for (const segment of segments) {
    for (
      let candidateStart = segment.startMinutes;
      candidateStart + duration <= segment.endMinutes;
      candidateStart += GRID_MINUTES
    ) {
      // Ignora horários já passados (só relevante se for hoje)
      if (isToday && candidateStart <= nowMinutes) continue;

      const candidate: Interval = {
        startMinutes: candidateStart,
        endMinutes: candidateStart + duration,
      };

      // Não pode colidir com nada ocupado
      if (busy.some((b) => overlaps(candidate, b))) continue;

      // Próxima fronteira depois deste candidato dentro do mesmo segmento
      // (próxima marcação que comece depois do fim do candidato, ou o fim do segmento)
      const nextBoundary = busy
        .filter((b) => b.startMinutes >= candidate.endMinutes && b.startMinutes < segment.endMinutes)
        .reduce((min, b) => Math.min(min, b.startMinutes), segment.endMinutes);

      const gap = nextBoundary - candidate.endMinutes;

      // Regra rígida: esconde se deixar exatamente um buraco de 15 min "preso"
      if (gap === ORPHAN_GAP_MINUTES) continue;

      results.push(minutesToTime(candidateStart));
    }
  }

  return results;
}
