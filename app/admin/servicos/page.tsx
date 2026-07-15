'use client';

import { useEffect, useState, useCallback } from 'react';

interface ServiceRow {
  id: string;
  barber_id: string;
  name: string;
  duration_minutes: number;
  price: number;
  active: boolean;
  prepayment_amount: number | null;
  prepayment_link: string | null;
}

const BARBERS = [
  { id: 'andre', name: 'André' },
  { id: 'rui', name: 'Rui Abreu' },
];

export default function ServicosPage() {
  const [barberId, setBarberId] = useState('andre');
  const [services, setServices] = useState<ServiceRow[]>([]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/services?barberId=${barberId}`);
    const data = await res.json();
    setServices(data.services ?? []);
  }, [barberId]);

  useEffect(() => {
    load();
  }, [load]);

  async function update(row: ServiceRow, updates: Partial<ServiceRow>) {
    setServices((prev) => prev.map((s) => (s.id === row.id ? { ...s, ...updates } : s)));
    await fetch('/api/admin/services', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, ...updates }),
    });
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-6">Serviços</h1>

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

      <div className="flex flex-col gap-2">
        {services.map((s) => (
          <div
            key={s.id}
            className="rounded-xl border border-[var(--line)] p-4 flex flex-wrap items-center gap-4"
            style={{ background: 'var(--surface)' }}
          >
            <input
              value={s.name}
              onChange={(e) => update(s, { name: e.target.value })}
              className="flex-1 min-w-[160px] px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] text-sm"
            />
            <label className="flex items-center gap-2 text-xs text-[var(--ivory-dim)]">
              Duração
              <input
                type="number"
                step={15}
                value={s.duration_minutes}
                onChange={(e) => update(s, { duration_minutes: Number(e.target.value) })}
                className="w-16 px-2 py-1 rounded bg-[var(--surface-2)] border border-[var(--line)] text-sm"
              />
              min
            </label>
            <label className="flex items-center gap-2 text-xs text-[var(--ivory-dim)]">
              Preço
              <input
                type="number"
                step={0.5}
                value={s.price}
                onChange={(e) => update(s, { price: Number(e.target.value) })}
                className="w-20 px-2 py-1 rounded bg-[var(--surface-2)] border border-[var(--line)] text-sm"
              />
              €
            </label>
            <label className="flex items-center gap-2 text-xs text-[var(--ivory-dim)]">
              <input
                type="checkbox"
                checked={s.active}
                onChange={(e) => update(s, { active: e.target.checked })}
              />
              Ativo
            </label>
            <label className="flex items-center gap-2 text-xs text-[var(--ivory-dim)] w-full mt-1">
              Pré-pag.
              <input
                type="number"
                step={0.5}
                placeholder="padrão"
                value={s.prepayment_amount ?? ''}
                onChange={(e) =>
                  update(s, { prepayment_amount: e.target.value === '' ? null : Number(e.target.value) })
                }
                className="w-20 px-2 py-1 rounded bg-[var(--surface-2)] border border-[var(--line)] text-sm"
              />
              €
              <input
                placeholder="Link de pagamento (Revolut)"
                value={s.prepayment_link ?? ''}
                onChange={(e) => update(s, { prepayment_link: e.target.value || null })}
                className="flex-1 min-w-[180px] px-2 py-1 rounded bg-[var(--surface-2)] border border-[var(--line)] text-sm"
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
