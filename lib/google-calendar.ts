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

  const timeMin = `${dateISO}T00:00:00`;
  const timeMax = `${dateISO}T23:59:59`;

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
    console.error('Erro ao consultar Google Calendar (freebusy):', err);
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
    const res = await cal.events.insert({
      calendarId,
      requestBody: {
        summary: params.summary,
        description: params.description,
        start: { dateTime: `${params.dateISO}T${params.startTime}:00`, timeZone: 'Europe/Lisbon' },
        end: { dateTime: `${params.dateISO}T${params.endTime}:00`, timeZone: 'Europe/Lisbon' },
      },
    });
    return res.data.id ?? null;
  } catch (err) {
    console.error('Erro ao criar evento no Google Calendar:', err);
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
