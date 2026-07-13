'use client';

import { useEffect, useState, useCallback } from 'react';

interface ScheduleRow {
  id: string;
  barber_id: string;
  day_of_week: number;
  works: boolean;
  start_time: string | null;
  end_time: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
}
interface TimeOff {
  id: string;
  barber_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const BARBERS = [
  { id: 'andre', name: 'André' },
  { id: 'rui', name: 'Rui Abreu' },
];

export default function HorariosPage() {
  const [barberId, setBarberId] = useState('andre');
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [newOffDate, setNewOffDate] = useState('');
  const [newOffReason, setNewOffReason] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/schedule?barberId=${barberId}`);
    const data = await res.json();
    setSchedule(data.schedule ?? []);
    setTimeOff(data.timeOff ?? []);
  }, [barberId]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateRow(row: ScheduleRow, updates: Partial<ScheduleRow>) {
    setSchedule((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...updates } : r)));
    await fetch('/api/admin/schedule', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, ...updates }),
    });
  }

  async function addTimeOff() {
    if (!newOffDate) return;
    await fetch('/api/admin/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barber_id: barberId, date: newOffDate, reason: newOffReason }),
    });
    setNewOffDate('');
    setNewOffReason('');
    load();
  }

  async function removeTimeOff(id: string) {
    await fetch(`/api/admin/schedule?id=${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-6">Horários</h1>

      <div className="flex gap-2 mb-8">
        {BARBERS.map((b) => (
          <button
            key={b.id}
            onClick={() => setBarberId(b.id)}
            className="px-4 py-2 rounded-lg text-sm border"
            style={{
              borderColor: barberId === b.id ? 'var(--gold)' : 'var(--line)',
              color: barberId === b.id ? 'var(--gold)' : 'var(--ivory-dim)',
            }}
          >
            {b.name}
          </button>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-[var(--ivory-dim)] mb-3">Horário semanal</h2>
      <div className="flex flex-col gap-2 mb-10">
        {schedule
          .slice()
          .sort((a, b) => a.day_of_week - b.day_of_week)
          .map((row) => (
            <div
              key={row.id}
              className="rounded-xl border border-[var(--line)] p-3 flex flex-wrap items-center gap-3"
              style={{ background: 'var(--surface)' }}
            >
              <label className="flex items-center gap-2 w-28 text-sm">
                <input
                  type="checkbox"
                  checked={row.works}
                  onChange={(e) => updateRow(row, { works: e.target.checked })}
                />
                {DAYS[row.day_of_week]}
              </label>

              {row.works && (
                <>
                  <input
                    type="time"
                    value={row.start_time ?? ''}
                    onChange={(e) => updateRow(row, { start_time: e.target.value })}
                    className="px-2 py-1 rounded bg-[var(--surface-2)] border border-[var(--line)] text-xs"
                  />
                  <span className="text-xs text-[var(--ivory-dim)]">até</span>
                  <input
                    type="time"
                    value={row.end_time ?? ''}
                    onChange={(e) => updateRow(row, { end_time: e.target.value })}
                    className="px-2 py-1 rounded bg-[var(--surface-2)] border border-[var(--line)] text-xs"
                  />
                  <span className="text-xs text-[var(--ivory-dim)] ml-2">almoço</span>
                  <input
                    type="time"
                    value={row.lunch_start ?? ''}
                    onChange={(e) => updateRow(row, { lunch_start: e.target.value })}
                    className="px-2 py-1 rounded bg-[var(--surface-2)] border border-[var(--line)] text-xs"
                  />
                  <span className="text-xs text-[var(--ivory-dim)]">até</span>
                  <input
                    type="time"
                    value={row.lunch_end ?? ''}
                    onChange={(e) => updateRow(row, { lunch_end: e.target.value })}
                    className="px-2 py-1 rounded bg-[var(--surface-2)] border border-[var(--line)] text-xs"
                  />
                </>
              )}
            </div>
          ))}
      </div>

      <h2 className="text-sm font-semibold text-[var(--ivory-dim)] mb-3">Folgas pontuais</h2>
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          type="date"
          value={newOffDate}
          onChange={(e) => setNewOffDate(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm"
        />
        <input
          placeholder="Motivo (opcional)"
          value={newOffReason}
          onChange={(e) => setNewOffReason(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm flex-1 min-w-[160px]"
        />
        <button
          onClick={addTimeOff}
          className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--red)', color: 'var(--ivory)' }}
        >
          Adicionar folga
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {timeOff.map((t) => (
          <div
            key={t.id}
            className="flex justify-between items-center rounded-lg border border-[var(--line)] px-4 py-2 text-sm"
            style={{ background: 'var(--surface)' }}
          >
            <span>
              {t.date} {t.reason && `· ${t.reason}`}
            </span>
            <button onClick={() => removeTimeOff(t.id)} className="text-xs text-[var(--red)]">
              Remover
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
