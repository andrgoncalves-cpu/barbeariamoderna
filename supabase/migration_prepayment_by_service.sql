-- ============================================================
-- Migração: pré-pagamento específico por tipo de serviço
-- Corre APENAS este ficheiro no SQL Editor do Supabase
-- (não voltes a correr o schema.sql completo, já foi corrido antes)
-- ============================================================

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
