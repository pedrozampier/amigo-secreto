-- 0001_schema.sql — 4 tabelas, constraints, índices, trigger de profile
-- Nomes de entidade em inglês (CLAUDE.md): Grupo->group, Participante->participant, Sorteio->draw

create extension if not exists "pgcrypto";

-- profile: espelha auth.users. id É o auth.users.id (não uma PK própria).
create table public.profile (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  display_name  text not null,
  avatar_url    text,
  created_at    timestamptz not null default now()
);

create table public.group (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 3 and 60),
  admin_id          uuid not null references public.profile (id) on delete cascade,
  status            text not null default 'open'
                      check (status in ('open', 'drawing', 'closed')),
  invite_token      text not null unique default encode(gen_random_bytes(16), 'hex'),
  min_participants  int  not null default 3 check (min_participants >= 3),
  created_at        timestamptz not null default now()
);

create table public.participant (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.group (id) on delete cascade,
  user_id       uuid not null references public.profile (id) on delete cascade,
  display_name  text not null,
  wish_list     text,
  joined_at     timestamptz not null default now()
);

create table public.draw (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.group (id) on delete cascade,
  giver_id     uuid not null references public.participant (id) on delete cascade,
  receiver_id  uuid not null references public.participant (id) on delete cascade,
  created_at   timestamptz not null default now()
);

-- === Constraints (ARCHITECTURE.md Problema 3) ===

-- DB-02: um usuário não pode ter duas linhas de participante no mesmo grupo
alter table public.participant
  add constraint participant_group_user_unique unique (group_id, user_id);

-- DB-04: ninguém tira a si mesmo (defesa em profundidade sobre a garantia do algoritmo)
alter table public.draw
  add constraint draw_no_self_gift check (giver_id <> receiver_id);

-- DB-03: perfect matching — cada participante dá exatamente uma vez...
alter table public.draw
  add constraint draw_giver_unique unique (group_id, giver_id);

-- DB-03: ...e recebe exatamente uma vez
alter table public.draw
  add constraint draw_receiver_unique unique (group_id, receiver_id);

-- === Índices usados pelas policies (DB-09) — Postgres não indexa FK automaticamente ===
create index idx_participant_group_id on public.participant (group_id);
create index idx_participant_user_id  on public.participant (user_id);
create index idx_draw_group_id        on public.draw (group_id);
create index idx_draw_giver_id        on public.draw (giver_id);
create index idx_group_admin_id       on public.group (admin_id);

-- === Trigger handle_new_user: popula profile ao criar conta ===
-- Consumido pela AUTH-06 na Fase 2, mas é infraestrutura de banco (DB-01), criado aqui.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
