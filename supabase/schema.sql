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
  group_id   uuid not null default gen_random_uuid(),  -- une todas as versões do mesmo preço
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
comment on column public.fare_prices.group_id is 'Todas as versões de um mesmo preço compartilham este id; só uma fica ativa.';

-- Bancos criados antes da coluna group_id: cada linha antiga vira o próprio grupo.
alter table public.fare_prices add column if not exists group_id uuid not null default gen_random_uuid();

create index if not exists fare_prices_user_id_idx        on public.fare_prices (user_id);
create index if not exists fare_prices_user_active_idx    on public.fare_prices (user_id, active);
create index if not exists fare_prices_group_active_idx   on public.fare_prices (group_id, active);

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
  -- Ordem do trecho dentro do lançamento: 0 é o primeiro da ida.
  leg_order   smallint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.trips is 'Trechos de deslocamento; cada linha vira uma linha da tabela do relatório.';
comment on column public.trips.line is 'Número da linha do ônibus. Fica nulo/vazio em barca.';
comment on column public.trips.leg_order is
  'Ordem dentro do lançamento. now() é o horário da transação, então os quatro trechos de um dia nascem com created_at idêntico; sem esta coluna a ordem da ida e da volta se perde.';

-- Bancos criados antes desta coluna.
alter table public.trips add column if not exists leg_order smallint not null default 0;

create index if not exists trips_user_id_idx        on public.trips (user_id);
create index if not exists trips_user_date_idx      on public.trips (user_id, date, created_at, leg_order);
-- Autocomplete de bairros e de cliente usa estes índices.
create index if not exists trips_user_origin_idx    on public.trips (user_id, origin);
create index if not exists trips_user_dest_idx      on public.trips (user_id, destination);
create index if not exists trips_user_client_idx    on public.trips (user_id, client);

-- ---------------------------------------------------------------------------
-- 5. Locais salvos — atalho para lançar um dia inteiro de uma vez
-- ---------------------------------------------------------------------------
-- Um "local" é um destino de trabalho recorrente (ex: HCNI) junto com o
-- caminho até ele. Se a ida são 2 ônibus, o local guarda esses 2 trechos em
-- ordem. No dia, o usuário escolhe o local + a data e o app lança a ida e,
-- se marcar ida e volta, também os trechos de volta espelhados (ordem
-- invertida, origem<->destino trocados, cliente = 'Residência').
--
-- Isto não guarda relatório nenhum: gera trechos em public.trips, que
-- continuam sendo a única fonte do relatório.

create table if not exists public.places (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,                       -- 'HCNI', 'Tecnoarte'
  active     boolean not null default true,       -- false = arquivado, some da lista
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table  public.places is 'Local de trabalho recorrente com o trajeto de ida salvo.';
comment on column public.places.name is 'Nome do local; vira o CLIENTE dos trechos de ida.';

create index if not exists places_user_id_idx     on public.places (user_id);
create index if not exists places_user_active_idx on public.places (user_id, active);

-- Não deixa o mesmo usuário cadastrar dois locais com o mesmo nome.
create unique index if not exists places_user_name_uniq
  on public.places (user_id, lower(name));

-- Trechos da IDA, na ordem. A volta é derivada destes na hora de lançar,
-- então não precisa ser cadastrada.
create table if not exists public.place_legs (
  id            uuid primary key default gen_random_uuid(),
  place_id      uuid not null references public.places (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  position      integer not null check (position > 0),  -- 1 = primeiro ônibus, 2 = segundo...
  origin        text not null,
  destination   text not null,
  client        text,                              -- nulo = usa o nome do local
  transport     public.transport_type not null,
  line          text,
  card          public.card_type not null,
  fare_group_id uuid,                              -- de onde vem o valor vigente
  value         numeric(10, 2) not null check (value >= 0),  -- usado se o preço sumir
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (place_id, position)
);

comment on table  public.place_legs is 'Trechos da ida de um local, em ordem; a volta é espelhada na hora do lançamento.';
comment on column public.place_legs.user_id is 'Repetido aqui só para a RLS não precisar de subconsulta.';
comment on column public.place_legs.fare_group_id is 'Grupo em fare_prices; o valor lançado é sempre o da versão ativa.';
comment on column public.place_legs.value is 'Cópia do valor no cadastro, usada como reserva se o preço for apagado.';

create index if not exists place_legs_place_id_idx on public.place_legs (place_id, position);
create index if not exists place_legs_user_id_idx  on public.place_legs (user_id);

-- ---------------------------------------------------------------------------
-- 6. updated_at automático
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

drop trigger if exists places_set_updated_at on public.places;
create trigger places_set_updated_at
  before update on public.places
  for each row execute function public.set_updated_at();

drop trigger if exists place_legs_set_updated_at on public.place_legs;
create trigger place_legs_set_updated_at
  before update on public.place_legs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Criação automática do profile no cadastro
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
-- 8. RLS — cada usuário enxerga e altera apenas os próprios dados
-- ---------------------------------------------------------------------------

alter table public.profiles    enable row level security;
alter table public.fare_prices enable row level security;
alter table public.trips       enable row level security;
alter table public.places      enable row level security;
alter table public.place_legs  enable row level security;

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

-- places
drop policy if exists "places_select_own" on public.places;
create policy "places_select_own" on public.places
  for select using (auth.uid() = user_id);

drop policy if exists "places_insert_own" on public.places;
create policy "places_insert_own" on public.places
  for insert with check (auth.uid() = user_id);

drop policy if exists "places_update_own" on public.places;
create policy "places_update_own" on public.places
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "places_delete_own" on public.places;
create policy "places_delete_own" on public.places
  for delete using (auth.uid() = user_id);

-- place_legs
drop policy if exists "place_legs_select_own" on public.place_legs;
create policy "place_legs_select_own" on public.place_legs
  for select using (auth.uid() = user_id);

drop policy if exists "place_legs_insert_own" on public.place_legs;
create policy "place_legs_insert_own" on public.place_legs
  for insert with check (auth.uid() = user_id);

drop policy if exists "place_legs_update_own" on public.place_legs;
create policy "place_legs_update_own" on public.place_legs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "place_legs_delete_own" on public.place_legs;
create policy "place_legs_delete_own" on public.place_legs
  for delete using (auth.uid() = user_id);
