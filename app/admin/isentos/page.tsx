'use client';

import { useEffect, useState, useCallback } from 'react';

interface Customer {
  phone: string;
  name: string | null;
  email: string | null;
  completed_count: number;
  no_show_flag: boolean;
  override: 'none' | 'always_exempt' | 'always_pay';
}

function statusLabel(c: Customer): { label: string; color: string } {
  if (c.override === 'always_pay') return { label: 'Paga sempre (manual)', color: '#C6222F' };
  if (c.override === 'always_exempt') return { label: 'Isento (manual)', color: '#8FBF8A' };
  if (c.no_show_flag) return { label: 'Paga sempre (faltou sem avisar)', color: '#C6222F' };
  if (c.completed_count >= 3) return { label: 'Isento (fidelização)', color: '#8FBF8A' };
  return { label: `Paga (${c.completed_count}/3 para isenção)`, color: '#C9A24B' };
}

export default function IsentosPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/exempt');
    const data = await res.json();
    setCustomers(data.customers ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setOverride(phone: string, override: string, name?: string) {
    await fetch('/api/admin/exempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, override, name }),
    });
    load();
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-6">Isentos de Pré-Pagamento</h1>

      <div className="flex gap-2 mb-8 flex-wrap">
        <input
          placeholder="Telefone"
          value={newPhone}
          onChange={(e) => setNewPhone(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm"
        />
        <input
          placeholder="Nome (opcional)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm flex-1 min-w-[160px]"
        />
        <button
          onClick={() => {
            if (!newPhone) return;
            setOverride(newPhone, 'always_exempt', newName);
            setNewPhone('');
            setNewName('');
          }}
          className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--gold)', color: '#171826' }}
        >
          Adicionar isento
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {customers.map((c) => {
          const s = statusLabel(c);
          return (
            <div
              key={c.phone}
              className="rounded-xl border border-[var(--line)] p-4 flex flex-wrap items-center justify-between gap-3"
              style={{ background: 'var(--surface)' }}
            >
              <div>
                <div className="text-sm font-semibold">{c.name || '(sem nome)'} · {c.phone}</div>
                <div className="text-xs mt-1" style={{ color: s.color }}>
                  {s.label}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setOverride(c.phone, 'always_exempt')}
                  className="text-xs px-3 py-1.5 rounded-lg border border-[var(--line)]"
                >
                  Isentar
                </button>
                <button
                  onClick={() => setOverride(c.phone, 'always_pay')}
                  className="text-xs px-3 py-1.5 rounded-lg border border-[var(--line)] text-[var(--red)]"
                >
                  Bloquear (paga sempre)
                </button>
                <button
                  onClick={() => setOverride(c.phone, 'none')}
                  className="text-xs px-3 py-1.5 rounded-lg border border-[var(--line)] text-[var(--ivory-dim)]"
                >
                  Repor automático
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
