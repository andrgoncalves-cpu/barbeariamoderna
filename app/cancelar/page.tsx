'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface BookingInfo {
  id: string;
  status: string;
  date: string;
  time: string;
  serviceName: string;
  barberName: string;
  price: number;
}

function CancelarContent() {
  const params = useSearchParams();
  const token = params.get('token');

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [withinFreeWindow, setWithinFreeWindow] = useState(true);
  const [freeCancelHours, setFreeCancelHours] = useState(6);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Link inválido.');
      setLoading(false);
      return;
    }
    fetch(`/api/cancel?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setBooking(d.booking);
          setWithinFreeWindow(d.withinFreeCancelWindow);
          setFreeCancelHours(d.freeCancelHours);
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleCancel() {
    if (!token) return;
    const res = await fetch('/api/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (res.ok) setDone(true);
  }

  return (
    <div className="min-h-screen bg-[var(--navy)] flex items-center justify-center px-6">
      <div className="max-w-[420px] w-full">
        <div className="font-display text-lg text-center mb-8">Barbearia Moderna de Tábua</div>

        {loading && <p className="text-center text-[var(--ivory-dim)] text-sm">A carregar…</p>}

        {error && <p className="text-center text-[var(--red)] text-sm">{error}</p>}

        {done && (
          <div className="text-center">
            <h2 className="font-display text-xl font-semibold mb-3">Marcação cancelada</h2>
            <p className="text-sm text-[var(--ivory-dim)]">Já não vamos contar consigo nesse horário.</p>
          </div>
        )}

        {!loading && !error && !done && booking && (
          <div
            className="rounded-2xl p-6 border border-[var(--line)]"
            style={{ background: 'var(--surface)' }}
          >
            {booking.status === 'cancelled' ? (
              <p className="text-center text-sm text-[var(--ivory-dim)]">Esta marcação já foi cancelada.</p>
            ) : (
              <>
                <div className="text-xs text-[var(--ivory-dim)] mb-1">{booking.barberName}</div>
                <div className="font-display text-lg font-semibold mb-1">{booking.serviceName}</div>
                <div className="text-sm text-[var(--gold)] mb-6">
                  {booking.date} às {booking.time}
                </div>

                {!withinFreeWindow && (
                  <p className="text-xs text-[var(--ivory-dim)] mb-4 leading-relaxed">
                    Estamos a menos de {freeCancelHours}h da marcação — se pagou pré-pagamento, o
                    valor não é devolvido automaticamente para cancelamentos tão próximos.
                  </p>
                )}

                <button
                  onClick={handleCancel}
                  className="w-full py-3 rounded-lg text-sm font-semibold"
                  style={{ background: 'var(--red)', color: 'var(--ivory)' }}
                >
                  Cancelar Marcação
                </button>
                <a
                  href="/"
                  className="block text-center mt-4 text-sm text-[var(--ivory-dim)] underline"
                >
                  Prefiro reagendar (fazer nova marcação)
                </a>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CancelarPage() {
  return (
    <Suspense fallback={null}>
      <CancelarContent />
    </Suspense>
  );
}
