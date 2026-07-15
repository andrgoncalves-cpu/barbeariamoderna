-- ============================================================
-- Migração: novas durações dos serviços do André
-- (Rui mantém-se inalterado)
-- Corre APENAS este ficheiro no SQL Editor do Supabase
-- ============================================================

update services
set duration_minutes = 20
where barber_id = 'andre' and name in ('Corte Social', 'Corte Degradê', 'Corte Cabelo 1 Pente', 'Barba');

update services
set duration_minutes = 40
where barber_id = 'andre' and name in ('Corte Social + Barba', 'Corte Degradê + Barba');
