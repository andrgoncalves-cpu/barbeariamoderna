'use client';

import { useEffect, useState, useCallback } from 'react';

interface Booking {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_phone: string;
  price: number;
  status: string;
  payment_status: string;
  requires_prepayment: boolean;
  source: string;
  services: { name: string; duration_minutes: number } | null;
  barbers: { name: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pendente de pagamento',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  no_show: 'Falta',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  pending_payment: '#C9A24B',
  confirmed: '#8FBF8A',
  completed: '#8FBF8A',
  no_show: '#C6222F',
  cancelled: '#6b6f7a',
};

export default function DashboardPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/bookings?from=${date}&to=${date}`);
    const data = await res.json();
    setBookings(data.bookings ?? []);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmPayment(id: string) {
    await fetch(`/api/admin/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm-payment' }),
    });
    load();
  }

  async function setStatus(id: string, status: string) {
    await fetch(`/api/admin/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status', status }),
    });
    load();
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-6">Agenda</h1>

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm mb-6"
      />

      {loading && <p className="text-sm text-[var(--ivory-dim)]">A carregar…</p>}
      {!loading && bookings.length === 0 && (
        <p className="text-sm text-[var(--ivory-dim)]">Sem marcações nesta data.</p>
      )}

      <div className="flex flex-col gap-3">
        {bookings.map((b) => (
          <div
            key={b.id}
            className="rounded-xl border border-[var(--line)] p-4"
            style={{ background: 'var(--surface)' }}
          >
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <div className="text-sm font-semibold">
                  {b.start_time.slice(0, 5)} — {b.services?.name}{' '}
                  <span className="text-[var(--ivory-dim)] font-normal">· {b.barbers?.name}</span>
                </div>
                <div className="text-xs text-[var(--ivory-dim)] mt-1">
                  {b.customer_name} · {b.customer_phone} · {b.price.toFixed(2)}€
                  {b.source === 'manual' && ' · manual'}
                </div>
              </div>
              <span
                className="text-[11px] px-2 py-1 rounded-full font-medium"
                style={{ color: STATUS_COLORS[b.status], background: `${STATUS_COLORS[b.status]}22` }}
              >
                {STATUS_LABELS[b.status]}
              </span>
            </div>

            <div className="flex gap-2 mt-3 flex-wrap">
              {b.status === 'pending_payment' && (
                <button
                  onClick={() => confirmPayment(b.id)}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                  style={{ background: 'var(--gold)', color: '#171826' }}
                >
                  Confirmar Pagamento
                </button>
              )}
              {b.status === 'confirmed' && (
                <>
                  <button
                    onClick={() => setStatus(b.id, 'completed')}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[var(--line)]"
                  >
                    Marcar Concluído
                  </button>
                  <button
                    onClick={() => setStatus(b.id, 'no_show')}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[var(--line)] text-[var(--red)]"
                  >
                    Falta sem aviso
                  </button>
                  <button
                    onClick={() => setStatus(b.id, 'cancelled')}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[var(--line)] text-[var(--ivory-dim)]"
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
