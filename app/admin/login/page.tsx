'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push('/admin/dashboard');
      router.refresh();
    } else {
      const d = await res.json();
      setError(d.error ?? 'Erro ao entrar.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[var(--navy)] flex items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="max-w-[340px] w-full rounded-2xl border border-[var(--line)] p-8"
        style={{ background: 'var(--surface)' }}
      >
        <div className="font-display text-lg text-center mb-1">Barbearia Moderna</div>
        <div className="text-xs text-center text-[var(--ivory-dim)] mb-8">Backoffice</div>

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] text-sm outline-none focus:border-[var(--gold)] mb-4"
          autoFocus
        />

        {error && <p className="text-xs text-[var(--red)] mb-4">{error}</p>}

        <button
          disabled={loading}
          className="w-full py-3 rounded-lg text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--red)', color: 'var(--ivory)' }}
        >
          {loading ? 'A entrar…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
