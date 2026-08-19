-- Ordem do trecho dentro do lançamento.
--
-- now() é o horário da transação: os quatro trechos de um dia nascem com o
-- mesmo created_at e o banco devolve em ordem arbitrária. Sem esta coluna a
-- ida e a volta trocam de lugar no relatório.
--
-- Rodar no SQL Editor do Supabase. Pode rodar mais de uma vez sem estragar
-- nada.

alter table public.trips
  add column if not exists leg_order smallint not null default 0;

comment on column public.trips.leg_order is
  'Ordem dentro do lançamento. now() é o horário da transação, então os quatro trechos de um dia nascem com created_at idêntico; sem esta coluna a ordem da ida e da volta se perde.';

-- O índice de listagem nasceu antes da coluna, e "if not exists" não o
-- atualizaria: recriar é o único jeito de a ordenação usar o índice.
drop index if exists public.trips_user_date_idx;
create index trips_user_date_idx
  on public.trips (user_id, date, created_at, leg_order);
