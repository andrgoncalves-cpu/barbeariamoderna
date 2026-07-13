'use client';

import { useEffect, useState } from 'react';

interface Barber {
  id: string;
  name: string;
  image: string;
}
interface Service {
  id: string;
  barber_id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

const STEPS = ['Profissional', 'Serviço', 'Data', 'Confirmar'];

function nextDays(count: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    out.push(day.toISOString().slice(0, 10));
  }
  return out;
}

function formatDayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const weekday = d.toLocaleDateString('pt-PT', { weekday: 'short' });
  const day = d.getDate();
  const month = d.toLocaleDateString('pt-PT', { month: 'short' });
  return `${weekday} ${day} ${month}`;
}

export default function BookingPage() {
  const [step, setStep] = useState(1);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(nextDays(1)[0]);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    requiresPrepayment: boolean;
    prepaymentAmount: number;
    prepaymentLink: string | null;
    holdMinutes: number | null;
  } | null>(null);

  useEffect(() => {
    fetch('/api/public/data')
      .then((r) => r.json())
      .then((d) => {
        setBarbers(d.barbers);
        setServices(d.services);
      });
  }, []);

  useEffect(() => {
    if (!selectedBarber || !selectedService || !selectedDate) return;
    setLoadingSlots(true);
    setSelectedTime(null);
    fetch(
      `/api/availability?barberId=${selectedBarber.id}&serviceId=${selectedService.id}&date=${selectedDate}`
    )
      .then((r) => r.json())
      .then((d) => setSlots(d.slots ?? []))
      .finally(() => setLoadingSlots(false));
  }, [selectedBarber, selectedService, selectedDate]);

  const barberServices = services.filter((s) => s.barber_id === selectedBarber?.id);

  async function handleConfirm() {
    if (!selectedBarber || !selectedService || !selectedTime) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId: selectedBarber.id,
          serviceId: selectedService.id,
          date: selectedDate,
          time: selectedTime,
          name,
          phone,
          email,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível concluir a marcação.');
        return;
      }
      setResult(data.booking);
      setStep(5);
    } catch {
      setError('Erro de ligação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--navy)] relative">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 800px 500px at 15% -10%, rgba(58,91,168,0.18), transparent 60%), radial-gradient(ellipse 700px 500px at 100% 10%, rgba(198,34,47,0.10), transparent 60%)',
        }}
      />
      <div className="relative max-w-[720px] mx-auto px-6">
        {/* NAV */}
        <nav className="flex items-center justify-between py-6 border-b border-[var(--line)]">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logótipo" className="w-9 h-9 rounded-full object-cover" />
            <div className="font-display text-sm leading-tight">
              Barbearia
              <b className="text-[var(--red)] block font-semibold">Moderna de Tábua</b>
            </div>
          </div>
        </nav>

        {step <= 4 && (
          <div className="text-center pt-14 pb-10">
            <div className="text-[11px] tracking-[0.28em] uppercase text-[var(--gold)] font-semibold mb-4">
              Agendamento Online
            </div>
            <h1 className="font-display text-[38px] sm:text-[46px] font-semibold leading-tight mb-4">
              Reserve o seu
              <br />
              horário em segundos
            </h1>
            <p className="text-[var(--ivory-dim)] text-[15px] max-w-[420px] mx-auto mb-9 leading-relaxed">
              Escolha o profissional, o serviço e o horário que preferir. Confirmação imediata por email.
            </p>

            <div className="flex justify-center gap-1.5 mb-2">
              {STEPS.map((label, i) => (
                <div key={label} className="flex-1 max-w-[150px] text-left">
                  <div
                    className="h-[2px] rounded mb-2"
                    style={{
                      background:
                        i + 1 <= step ? 'linear-gradient(90deg,var(--gold),#E4C878)' : 'var(--line)',
                    }}
                  />
                  <div
                    className="text-[10px] tracking-[0.1em] uppercase"
                    style={{ color: i + 1 === step ? 'var(--gold)' : 'var(--ivory-dim)' }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 1 — PROFISSIONAL */}
        {step === 1 && (
          <div className="pb-16">
            <div className="flex gap-4 flex-wrap">
              {barbers.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelectedBarber(b);
                    setSelectedService(null);
                    setStep(2);
                  }}
                  className="flex-1 min-w-[210px] rounded-2xl border p-7 text-center transition-colors"
                  style={{
                    background: 'linear-gradient(180deg,var(--surface),var(--surface-2))',
                    borderColor: selectedBarber?.id === b.id ? 'var(--gold)' : 'var(--line)',
                  }}
                >
                  <img
                    src={b.image}
                    alt={b.name}
                    className="w-22 h-22 rounded-full mx-auto mb-4 object-cover border-2"
                    style={{ borderColor: 'var(--gold)', width: 88, height: 88 }}
                  />
                  <h3 className="font-display text-lg font-semibold">{b.name}</h3>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — SERVIÇO */}
        {step === 2 && selectedBarber && (
          <div className="pb-16">
            <div className="rounded-2xl border border-[var(--line)] overflow-hidden">
              {barberServices.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedService(s);
                    setStep(3);
                  }}
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                  style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="text-[15px] font-semibold">{s.name}</span>
                    <span className="text-xs text-[var(--ivory-dim)]">{s.duration_minutes} min</span>
                  </div>
                  <span className="font-display text-lg font-semibold text-[var(--gold)]">
                    {s.price.toFixed(2)}€
                  </span>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(1)} className="mt-6 text-sm text-[var(--ivory-dim)] underline">
              ← Voltar
            </button>
          </div>
        )}

        {/* STEP 3 — DATA / HORA */}
        {step === 3 && selectedService && (
          <div className="pb-16">
            <div className="flex gap-2 overflow-x-auto mb-6 pb-1">
              {nextDays(14).map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className="shrink-0 px-4 py-2 rounded-xl text-xs border whitespace-nowrap"
                  style={{
                    borderColor: selectedDate === d ? 'var(--gold)' : 'var(--line)',
                    background: selectedDate === d ? 'var(--surface-2)' : 'var(--surface)',
                    color: selectedDate === d ? 'var(--gold)' : 'var(--ivory-dim)',
                  }}
                >
                  {formatDayLabel(d)}
                </button>
              ))}
            </div>

            {loadingSlots && <p className="text-sm text-[var(--ivory-dim)]">A calcular horários…</p>}

            {!loadingSlots && slots.length === 0 && (
              <p className="text-sm text-[var(--ivory-dim)]">
                Sem horários disponíveis neste dia. Escolha outra data.
              </p>
            )}

            <div className="grid grid-cols-4 gap-2.5">
              {slots.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className="py-3 text-center rounded-xl border text-sm"
                  style={
                    selectedTime === time
                      ? { background: 'linear-gradient(135deg,var(--gold),#B8863A)', color: '#171826', fontWeight: 600, borderColor: 'transparent' }
                      : { borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ivory)' }
                  }
                >
                  {time}
                </button>
              ))}
            </div>

            <div className="flex justify-between mt-8">
              <button onClick={() => setStep(2)} className="text-sm text-[var(--ivory-dim)] underline">
                ← Voltar
              </button>
              {selectedTime && (
                <button
                  onClick={() => setStep(4)}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ background: 'var(--red)', color: 'var(--ivory)' }}
                >
                  Continuar
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 4 — CONFIRMAR / DADOS */}
        {step === 4 && selectedBarber && selectedService && selectedTime && (
          <div className="pb-16">
            <div
              className="rounded-2xl p-6 mb-6"
              style={{ background: 'linear-gradient(135deg,var(--blue-deep),#16223F)', border: '1px solid rgba(58,91,168,0.4)' }}
            >
              <div className="text-xs text-[var(--ivory-dim)] mb-1">
                {selectedService.name} · {selectedBarber.name} · {formatDayLabel(selectedDate)} · {selectedTime}
              </div>
              <div className="font-display text-2xl font-semibold text-[var(--gold)]">
                {selectedService.price.toFixed(2)}€
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <input
                placeholder="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-4 py-3 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm outline-none focus:border-[var(--gold)]"
              />
              <input
                placeholder="Telefone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="px-4 py-3 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm outline-none focus:border-[var(--gold)]"
              />
              <input
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-4 py-3 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm outline-none focus:border-[var(--gold)]"
              />
            </div>

            {error && <p className="text-sm text-[var(--red)] mt-4">{error}</p>}

            <div className="flex justify-between mt-8">
              <button onClick={() => setStep(3)} className="text-sm text-[var(--ivory-dim)] underline">
                ← Voltar
              </button>
              <button
                disabled={!name || !phone || !email || submitting}
                onClick={handleConfirm}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40"
                style={{ background: 'var(--red)', color: 'var(--ivory)' }}
              >
                {submitting ? 'A confirmar…' : 'Confirmar Marcação'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5 — RESULTADO */}
        {step === 5 && result && (
          <div className="pb-20 pt-16 text-center">
            {result.requiresPrepayment ? (
              <>
                <div className="text-[11px] tracking-[0.24em] uppercase text-[var(--gold)] font-semibold mb-3">
                  Falta um passo
                </div>
                <h2 className="font-display text-2xl font-semibold mb-4">
                  Pré-pagamento de {result.prepaymentAmount.toFixed(2)}€
                </h2>
                <p className="text-sm text-[var(--ivory-dim)] max-w-[380px] mx-auto mb-8 leading-relaxed">
                  O seu horário fica reservado durante {result.holdMinutes} minutos. Pague através do
                  link abaixo — a confirmação definitiva chega por email assim que verificarmos o
                  pagamento.
                </p>
                <a
                  href={result.prepaymentLink ?? '#'}
                  target="_blank"
                  className="inline-block px-8 py-3 rounded-lg text-sm font-semibold"
                  style={{ background: 'var(--gold)', color: '#171826' }}
                >
                  Pagar {result.prepaymentAmount.toFixed(2)}€ na Revolut
                </a>
              </>
            ) : (
              <>
                <div className="text-[11px] tracking-[0.24em] uppercase text-[var(--gold)] font-semibold mb-3">
                  Tudo pronto
                </div>
                <h2 className="font-display text-2xl font-semibold mb-4">Marcação confirmada!</h2>
                <p className="text-sm text-[var(--ivory-dim)]">
                  Enviámos os detalhes para o seu email, com opção de reagendar ou cancelar.
                </p>
              </>
            )}
          </div>
        )}

        <footer className="border-t border-[var(--line)] py-10 text-center text-[13px] text-[var(--ivory-dim)] leading-loose">
          <div className="font-display text-base text-[var(--ivory)] mb-2">Barbearia Moderna de Tábua</div>
          Rua dos Bombeiros Voluntários 9A, 3420-322 Tábua
          <br />
          936 729 118
        </footer>
      </div>
    </div>
  );
}
