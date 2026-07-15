-- ============================================================
-- Barbearia Moderna de Tábua — Schema Supabase
-- Corre este ficheiro completo no SQL Editor do Supabase
-- (Dashboard → SQL Editor → New Query → colar tudo → Run)
-- ============================================================

-- Extensão para gerar UUIDs
create extension if not exists "pgcrypto";

-- ---------- BARBEIROS ----------
create table barbers (
  id text primary key,                 -- 'andre' | 'rui'
  name text not null,
  image text,
  active boolean not null default true,
  sort_order int not null default 0
);

insert into barbers (id, name, image, sort_order) values
  ('andre', 'André Gonçalves', '/andre.jpg', 1),
  ('rui', 'Rui Abreu', '/rui.jpg', 2);

-- ---------- HORÁRIO SEMANAL POR BARBEIRO ----------
-- day_of_week: 0=Domingo .. 6=Sábado
create table barber_schedule (
  id uuid primary key default gen_random_uuid(),
  barber_id text not null references barbers(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  works boolean not null default false,
  start_time time,
  end_time time,
  lunch_start time,
  lunch_end time,
  unique (barber_id, day_of_week)
);

-- André: Seg-Sáb 9:30-13:00 / 14:30-19:00, folga Terça e Domingo
insert into barber_schedule (barber_id, day_of_week, works, start_time, end_time, lunch_start, lunch_end) values
  ('andre', 0, false, null, null, null, null),
  ('andre', 1, true, '09:30', '19:00', '13:00', '14:30'),
  ('andre', 2, false, null, null, null, null),
  ('andre', 3, true, '09:30', '19:00', '13:00', '14:30'),
  ('andre', 4, true, '09:30', '19:00', '13:00', '14:30'),
  ('andre', 5, true, '09:30', '19:00', '13:00', '14:30'),
  ('andre', 6, true, '09:30', '19:00', '13:00', '14:30');

-- Rui: só Terça 9:30-13:00 / 14:30-19:00
insert into barber_schedule (barber_id, day_of_week, works, start_time, end_time, lunch_start, lunch_end) values
  ('rui', 0, false, null, null, null, null),
  ('rui', 1, false, null, null, null, null),
  ('rui', 2, true, '09:30', '19:00', '13:00', '14:30'),
  ('rui', 3, false, null, null, null, null),
  ('rui', 4, false, null, null, null, null),
  ('rui', 5, false, null, null, null, null),
  ('rui', 6, false, null, null, null, null);

-- ---------- FOLGAS / BLOQUEIOS PONTUAIS (férias, ausências) ----------
create table barber_time_off (
  id uuid primary key default gen_random_uuid(),
  barber_id text not null references barbers(id) on delete cascade,
  date date not null,
  start_time time,        -- null = dia inteiro
  end_time time,           -- null = dia inteiro
  reason text,
  created_at timestamptz not null default now()
);

-- ---------- SERVIÇOS (por barbeiro, porque duração varia entre André e Rui) ----------
create table services (
  id uuid primary key default gen_random_uuid(),
  barber_id text not null references barbers(id) on delete cascade,
  name text not null,
  duration_minutes int not null,   -- múltiplo de 15
  price numeric(6,2) not null,
  active boolean not null default true,
  sort_order int not null default 0
);

insert into services (barber_id, name, duration_minutes, price, sort_order) values
  ('andre', 'Corte Social', 30, 9.00, 1),
  ('andre', 'Corte Degradê', 30, 10.00, 2),
  ('andre', 'Corte Cabelo 1 Pente', 15, 7.00, 3),
  ('andre', 'Barba', 15, 7.50, 4),
  ('andre', 'Corte Social + Barba', 45, 16.50, 5),
  ('andre', 'Corte Degradê + Barba', 45, 17.50, 6),
  ('rui', 'Corte Social', 40, 9.00, 1),
  ('rui', 'Corte Degradê', 40, 10.00, 2),
  ('rui', 'Corte Cabelo 1 Pente', 20, 7.00, 3),
  ('rui', 'Barba', 20, 7.50, 4),
  ('rui', 'Corte Social + Barba', 60, 16.50, 5),
  ('rui', 'Corte Degradê + Barba', 60, 17.50, 6);

-- ---------- CLIENTES (chave = telefone) ----------
create table customers (
  phone text primary key,
  name text,
  email text,
  completed_count int not null default 0,     -- marcações cumpridas com sucesso
  no_show_flag boolean not null default false, -- true = falta sem aviso -> paga para sempre
  override text not null default 'none' check (override in ('none','always_exempt','always_pay')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- MARCAÇÕES ----------
create table bookings (
  id uuid primary key default gen_random_uuid(),
  barber_id text not null references barbers(id),
  service_id uuid not null references services(id),
  customer_phone text not null references customers(phone),
  customer_name text not null,
  customer_email text not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  price numeric(6,2) not null,
  requires_prepayment boolean not null default false,
  payment_status text not null default 'not_required'
    check (payment_status in ('not_required','pending','confirmed')),
  status text not null default 'confirmed'
    check (status in ('pending_payment','confirmed','completed','no_show','cancelled')),
  source text not null default 'site' check (source in ('site','manual','import')),
  cancel_token uuid not null default gen_random_uuid(),
  google_event_id text,
  notified_no_show boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bookings_barber_date on bookings (barber_id, date);
create index idx_bookings_phone on bookings (customer_phone);
create index idx_bookings_status on bookings (status);

-- ---------- CONFIGURAÇÃO GERAL (chave/valor, editável no backoffice) ----------
create table settings (
  key text primary key,
  value text not null
);

insert into settings (key, value) values
  ('prepayment_amount', '2.00'),
  ('prepayment_link', 'https://revolut.me/almgoncalves?currency=EUR&amount=200'),
  ('prepayment_hold_minutes', '15'),
  ('free_cancel_hours', '6'),
  ('loyalty_free_after', '3'),
  ('admin_password_hash', '');   -- definido depois via script/admin

-- ---------- Atualiza updated_at automaticamente ----------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_bookings_updated
  before update on bookings
  for each row execute function set_updated_at();

create trigger trg_customers_updated
  before update on customers
  for each row execute function set_updated_at();

-- ---------- Migração: pré-pagamento específico por tipo de serviço ----------
-- Corre isto no SQL Editor do Supabase (além do schema.sql já corrido antes)
alter table services add column if not exists prepayment_amount numeric(6,2);
alter table services add column if not exists prepayment_link text;

-- Serviços simples (só corte OU só barba) -> 3€
update services
set prepayment_amount = 3.00,
    prepayment_link = 'https://checkout.revolut.com/pay/6365d26b-88ef-447e-816e-152f4820f397'
where name in ('Corte Social', 'Corte Degradê', 'Corte Cabelo 1 Pente', 'Barba');

-- Combos (corte + barba) -> 6€
update services
set prepayment_amount = 6.00,
    prepayment_link = 'https://checkout.revolut.com/pay/fa7cba42-75e8-4d30-84fb-b234443415b0'
where name in ('Corte Social + Barba', 'Corte Degradê + Barba');

-- Bloqueamos tudo por defeito; o backend usa a service_role key (ignora RLS).
alter table barbers enable row level security;
alter table barber_schedule enable row level security;
alter table barber_time_off enable row level security;
alter table services enable row level security;
alter table customers enable row level security;
alter table bookings enable row level security;
alter table settings enable row level security;

-- Leitura pública apenas do necessário para a página de agendamento
create policy "public read barbers" on barbers for select using (active = true);
create policy "public read schedule" on barber_schedule for select using (true);
create policy "public read services" on services for select using (active = true);
