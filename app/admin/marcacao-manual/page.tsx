'use client';

import { useEffect, useState } from 'react';

interface Barber {
  id: string;
  name: string;
}
interface Service {
  id: string;
  barber_id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

export default function MarcacaoManualPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barberId, setBarberId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<string[]>([]);
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/public/data')
      .then((r) => r.json())
      .then((d) => {
        setBarbers(d.barbers);
        setServices(d.services);
      });
  }, []);

  useEffect(() => {
    if (!barberId || !serviceId || !date) return;
    fetch(`/api/availability?barberId=${barberId}&serviceId=${serviceId}&date=${date}&admin=1`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots ?? []));
  }, [barberId, serviceId, date]);

  async function handleSubmit() {
    setMessage(null);
    const res = await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barberId, serviceId, date, time, name, phone, email }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage('Marcação criada com sucesso.');
      setName('');
      setPhone('');
      setEmail('');
      setTime('');
    } else {
      setMessage(data.error ?? 'Erro ao criar marcação.');
    }
  }

  const barberServices = services.filter((s) => s.barber_id === barberId);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-6">Nova Marcação Manual</h1>

      <div className="flex flex-col gap-4 max-w-md">
        <select
          value={barberId}
          onChange={(e) => {
            setBarberId(e.target.value);
            setServiceId('');
          }}
          className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm"
        >
          <option value="">Profissional</option>
          {barbers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          disabled={!barberId}
          className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm"
        >
          <option value="">Serviço</option>
          {barberServices.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.duration_minutes}min — {s.price.toFixed(2)}€
            </option>
          ))}
        </select>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm"
        />

        <select
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm"
        >
          <option value="">Hora</option>
          {slots.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <input
          placeholder="Nome do cliente"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm"
        />
        <input
          placeholder="Telefone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm"
        />
        <input
          placeholder="Email (opcional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm"
        />

        {message && <p className="text-sm text-[var(--gold)]">{message}</p>}

        <button
          onClick={handleSubmit}
          disabled={!barberId || !serviceId || !time || !name || !phone}
          className="py-3 rounded-lg text-sm font-semibold disabled:opacity-40"
          style={{ background: 'var(--red)', color: 'var(--ivory)' }}
        >
          Criar Marcação
        </button>
      </div>
    </div>
  );
}
