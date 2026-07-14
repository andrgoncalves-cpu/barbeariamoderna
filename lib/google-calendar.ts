import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

function getAuth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
    ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, '')
    : undefined;

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey,
    },
    scopes: SCOPES,
  });
}

function calendarClient() {
  return google.calendar({ version: 'v3', auth: getAuth() });
}

function describeGoogleError(err: unknown): string {
  const anyErr = err as { response?: { data?: unknown }; message?: string };
  if (anyErr?.response?.data) {
    try {
      return JSON.stringify(anyErr.response.data);
    } catch {
      // ignore
    }
  }
  return anyErr?.message ?? String(err);
}

/** Devolve o offset (em minutos) do fuso indicado, nessa data/hora aproximada — lida com DST automaticamente. */
function getTimeZoneOffsetMinutes(approx: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(approx).reduce((acc: Record<string, string>, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return (asUTC - approx.getTime()) / 60000;
}

/** Constrói um timestamp RFC3339 válido (com offset) a partir de uma data/hora local em Lisboa.
 *  Aceita "HH:mm" ou "HH:mm:ss" (o Postgres devolve horas com segundos). */
function toRFC3339Lisbon(dateISO: string, time: string): string {
  const [y, mo, d] = dateISO.split('-').map(Number);
  const [h, m] = time.split(':').map(Number); // ignora segundos se existirem
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const approx = new Date(Date.UTC(y, mo - 1, d, h, m, 0));
  const offsetMin = getTimeZoneOffsetMinutes(approx, 'Europe/Lisbon');
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const oh = String(Math.floor(abs / 60)).padStart(2, '0');
  const om = String(abs % 60).padStart(2, '0');
  return `${dateISO}T${hh}:${mm}:00${sign}${oh}:${om}`;
}
function calendarIdFor(barberId: string): string | undefined {
  if (barberId === 'andre') return process.env.CALENDAR_ID_ANDRE;
  if (barberId === 'rui') return process.env.CALENDAR_ID_RUI;
  return undefined;
}

/** Devolve intervalos ocupados (em minutos desde 00:00) nesse calendário nesse dia. */
export async function getGoogleBusyIntervals(
  barberId: string,
  dateISO: string // 'YYYY-MM-DD'
): Promise<{ startMinutes: number; endMinutes: number }[]> {
  const calendarId = calendarIdFor(barberId);
  if (!calendarId) return [];

  const timeMin = `${dateISO}T00:00:00Z`;
  const timeMax = `${dateISO}T23:59:59Z`;

  try {
    const cal = calendarClient();
    const res = await cal.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        timeZone: 'Europe/Lisbon',
        items: [{ id: calendarId }],
      },
    });

    const busy = res.data.calendars?.[calendarId]?.busy ?? [];
    return busy.map((b) => {
      const start = new Date(b.start!);
      const end = new Date(b.end!);
      return {
        startMinutes: start.getHours() * 60 + start.getMinutes(),
        endMinutes: end.getHours() * 60 + end.getMinutes(),
      };
    });
  } catch (err) {
    console.error('Erro ao consultar Google Calendar (freebusy):', describeGoogleError(err));
    // Em caso de falha da API, não bloqueia o site — apenas ignora o cruzamento.
    return [];
  }
}

export async function createGoogleEvent(params: {
  barberId: string;
  summary: string;
  description: string;
  dateISO: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}): Promise<string | null> {
  const calendarId = calendarIdFor(params.barberId);
  if (!calendarId) return null;

  try {
    const cal = calendarClient();
    const requestBody = {
      summary: params.summary,
      description: params.description,
      start: { dateTime: toRFC3339Lisbon(params.dateISO, params.startTime), timeZone: 'Europe/Lisbon' },
      end: { dateTime: toRFC3339Lisbon(params.dateISO, params.endTime), timeZone: 'Europe/Lisbon' },
    };
    console.log('A criar evento no Google Calendar, corpo do pedido:', JSON.stringify(requestBody));
    const res = await cal.events.insert({
      calendarId,
      requestBody,
    });
    return res.data.id ?? null;
  } catch (err) {
    console.error(`Erro ao criar evento no Google Calendar (calendarId="${calendarId}"):`, describeGoogleError(err));
    return null;
  }
}

export async function deleteGoogleEvent(barberId: string, eventId: string): Promise<void> {
  const calendarId = calendarIdFor(barberId);
  if (!calendarId) return;
  try {
    const cal = calendarClient();
    await cal.events.delete({ calendarId, eventId });
  } catch (err) {
    console.error('Erro ao apagar evento no Google Calendar:', err);
  }
}
