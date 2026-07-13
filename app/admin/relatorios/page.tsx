'use client';

import { useState } from 'react';

interface ReportData {
  totalCount: number;
  totalRevenue: number;
  byService: Record<string, { count: number; revenue: number }>;
  byBarber: Record<string, { count: number; revenue: number }>;
  byDay: Record<string, { count: number; revenue: number }>;
}

function firstDayOfYear(): string {
  return `${new Date().getFullYear()}-01-01`;
}

export default function RelatoriosPage() {
  const [from, setFrom] = useState(firstDayOfYear());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  async function runReport() {
    setLoading(true);
    const res = await fetch(`/api/admin/reports?from=${from}&to=${to}`);
    const d = await res.json();
    setData(d);
    setLoading(false);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-6">Relatórios</h1>

      <div className="flex gap-2 mb-8 flex-wrap items-end">
        <div>
          <div className="text-xs text-[var(--ivory-dim)] mb-1">De</div>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm"
          />
        </div>
        <div>
          <div className="text-xs text-[var(--ivory-dim)] mb-1">Até</div>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm"
          />
        </div>
        <button
          onClick={runReport}
          className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--red)', color: 'var(--ivory)' }}
        >
          {loading ? 'A calcular…' : 'Gerar Relatório'}
        </button>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-8 max-w-md">
            <div className="rounded-xl border border-[var(--line)] p-4" style={{ background: 'var(--surface)' }}>
              <div className="text-xs text-[var(--ivory-dim)] mb-1">Marcações cumpridas</div>
              <div className="font-display text-2xl font-semibold">{data.totalCount}</div>
            </div>
            <div className="rounded-xl border border-[var(--line)] p-4" style={{ background: 'var(--surface)' }}>
              <div className="text-xs text-[var(--ivory-dim)] mb-1">Faturação</div>
              <div className="font-display text-2xl font-semibold text-[var(--gold)]">
                {data.totalRevenue.toFixed(2)}€
              </div>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-[var(--ivory-dim)] mb-3">Por profissional</h2>
          <div className="flex flex-col gap-2 mb-8">
            {Object.entries(data.byBarber).map(([name, v]) => (
              <div
                key={name}
                className="flex justify-between rounded-lg border border-[var(--line)] px-4 py-2 text-sm"
                style={{ background: 'var(--surface)' }}
              >
                <span>{name}</span>
                <span>
                  {v.count} marcações · {v.revenue.toFixed(2)}€
                </span>
              </div>
            ))}
          </div>

          <h2 className="text-sm font-semibold text-[var(--ivory-dim)] mb-3">Por serviço</h2>
          <div className="flex flex-col gap-2">
            {Object.entries(data.byService)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([name, v]) => (
                <div
                  key={name}
                  className="flex justify-between rounded-lg border border-[var(--line)] px-4 py-2 text-sm"
                  style={{ background: 'var(--surface)' }}
                >
                  <span>{name}</span>
                  <span>
                    {v.count}× · {v.revenue.toFixed(2)}€
                  </span>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
