-- ===========================================================================
-- Relatório de Reembolso de Passagem — schema completo
-- ---------------------------------------------------------------------------
-- Como aplicar:
--   Supabase Dashboard > SQL Editor > cole este arquivo inteiro > Run.
--   O script é idempotente: pode ser rodado mais de uma vez sem quebrar.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Tipos (enums)
-- ---------------------------------------------------------------------------

-- Meio de transporte usado no trecho.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'transport_type') then
    create type public.transport_type as enum ('onibus', 'barca');
  end if;
end $$;

-- Cartão em que a passagem foi paga.
-- Padrão: ônibus -> jae, barca -> riocard. O usuário pode trocar (ex: linha
-- 143C é ônibus mas é paga no RIO CARD), por isso o cartão é campo próprio.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'card_type') then
    create type public.card_type as enum ('riocard', 'jae');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Tabela profiles — dados do funcionário (cabeçalho do relatório)
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  name            text not null default '',
  supervisor_name text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table  public.profiles is 'Perfil do funcionário; alimenta o cabeçalho do relatório.';
comment on column public.profiles.name is 'NOME DO FUNCIONÁRIO no relatório.';
comment on column public.profiles.supervisor_name is 'NOME DO SUPERIOR IMEDIATO no relatório.';

-- ---------------------------------------------------------------------------
-- 3. Tabela fare_prices — valores de passagem cadastrados uma vez e reusados
-- ---------------------------------------------------------------------------
-- Reajuste NÃO sobrescreve: a linha antiga vira active = false e uma nova é
-- criada com o valor novo. Assim o histórico de preços fica preservado.

create table if not exists public.fare_prices (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  label      text not null,                       -- ex: 'Ônibus 323', 'Barca Cocotá/Praça XV'
  transport  public.transport_type not null,
  card       public.card_type not null,
  value      numeric(10, 2) not null check (value >= 0),
  active     boolean not null default true,       -- false = versão antiga (histórico)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table  public.fare_prices is 'Tabela de preços de passagem do usuário, com histórico de reajustes.';
comment on column public.fare_prices.label is 'Nome/atalho da passagem; costuma carregar a linha (ex: 323, 143C).';
comment on column public.fare_prices.active is 'true = preço vigente. Reajuste desativa o antigo e insere um novo.';

create index if not exists fare_prices_user_id_idx        on public.fare_prices (user_id);
create index if not exists fare_prices_user_active_idx    on public.fare_prices (user_id, active);

-- ---------------------------------------------------------------------------
-- 4. Tabela trips — 1 linha = 1 TRECHO (um dia normal tem 4 trechos)
-- ---------------------------------------------------------------------------
-- O valor é copiado para cá no momento do lançamento: um reajuste futuro em
-- fare_prices não pode alterar relatórios já fechados.

create table if not exists public.trips (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  date        date not null,
  origin      text not null,                      -- BAIRRO ORIGEM
  destination text not null,                      -- BAIRRO DESTINO
  client      text not null,                      -- CLIENTE, EMPRESA ou RESIDÊNCIA
  transport   public.transport_type not null,     -- MEIO DE TRANSPORTE
  line        text,                               -- LINHA (só faz sentido em ônibus)
  card        public.card_type not null,          -- cartão que pagou o trecho
  value       numeric(10, 2) not null check (value >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.trips is 'Trechos de deslocamento; cada linha vira uma linha da tabela do relatório.';
comment on column public.trips.line is 'Número da linha do ônibus. Fica nulo/vazio em barca.';

create index if not exists trips_user_id_idx        on public.trips (user_id);
create index if not exists trips_user_date_idx      on public.trips (user_id, date);
-- Autocomplete de bairros e de cliente usa estes índices.
create index if not exists trips_user_origin_idx    on public.trips (user_id, origin);
create index if not exists trips_user_dest_idx      on public.trips (user_id, destination);
create index if not exists trips_user_client_idx    on public.trips (user_id, client);

-- ---------------------------------------------------------------------------
-- 5. updated_at automático
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists fare_prices_set_updated_at on public.fare_prices;
create trigger fare_prices_set_updated_at
  before update on public.fare_prices
  for each row execute function public.set_updated_at();

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Criação automática do profile no cadastro
-- ---------------------------------------------------------------------------
-- O signup (F2) manda name e supervisor_name em raw_user_meta_data; este
-- trigger copia para public.profiles assim que o auth.users é criado.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, supervisor_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'supervisor_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 7. RLS — cada usuário enxerga e altera apenas os próprios dados
-- ---------------------------------------------------------------------------

alter table public.profiles    enable row level security;
alter table public.fare_prices enable row level security;
alter table public.trips       enable row level security;

-- profiles: a chave do dono é a própria PK (id = auth.uid()).
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- fare_prices
drop policy if exists "fare_prices_select_own" on public.fare_prices;
create policy "fare_prices_select_own" on public.fare_prices
  for select using (auth.uid() = user_id);

drop policy if exists "fare_prices_insert_own" on public.fare_prices;
create policy "fare_prices_insert_own" on public.fare_prices
  for insert with check (auth.uid() = user_id);

drop policy if exists "fare_prices_update_own" on public.fare_prices;
create policy "fare_prices_update_own" on public.fare_prices
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "fare_prices_delete_own" on public.fare_prices;
create policy "fare_prices_delete_own" on public.fare_prices
  for delete using (auth.uid() = user_id);

-- trips
drop policy if exists "trips_select_own" on public.trips;
create policy "trips_select_own" on public.trips
  for select using (auth.uid() = user_id);

drop policy if exists "trips_insert_own" on public.trips;
create policy "trips_insert_own" on public.trips
  for insert with check (auth.uid() = user_id);

drop policy if exists "trips_update_own" on public.trips;
create policy "trips_update_own" on public.trips
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "trips_delete_own" on public.trips;
create policy "trips_delete_own" on public.trips
  for delete using (auth.uid() = user_id);
