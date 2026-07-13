'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LINKS = [
  { href: '/admin/dashboard', label: 'Agenda' },
  { href: '/admin/marcacao-manual', label: 'Nova Marcação' },
  { href: '/admin/horarios', label: 'Horários' },
  { href: '/admin/servicos', label: 'Serviços' },
  { href: '/admin/isentos', label: 'Isentos' },
  { href: '/admin/relatorios', label: 'Relatórios' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/admin/login') return <>{children}</>;

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  return (
    <div className="min-h-screen bg-[var(--navy)] text-[var(--ivory)]">
      <div className="flex flex-col md:flex-row">
        <aside className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-[var(--line)] p-5">
          <div className="font-display text-sm mb-6">
            Barbearia
            <b className="block text-[var(--red)]">Backoffice</b>
          </div>
          <nav className="flex md:flex-col gap-1 flex-wrap">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 rounded-lg text-sm"
                style={{
                  background: pathname === link.href ? 'var(--surface-2)' : 'transparent',
                  color: pathname === link.href ? 'var(--gold)' : 'var(--ivory-dim)',
                }}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="text-left px-3 py-2 rounded-lg text-sm text-[var(--ivory-dim)] mt-2"
            >
              Sair
            </button>
          </nav>
        </aside>
        <main className="flex-1 p-6 max-w-4xl">{children}</main>
      </div>
    </div>
  );
}
