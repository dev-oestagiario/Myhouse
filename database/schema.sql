-- My House - executar exclusivamente em um projeto Supabase novo do My House.
-- Cada usuário possui um documento JSON versionado. A RLS isola por auth.uid().
-- Reexecutável para instalação nova; para uma tabela já existente, aplicar database/migrations/20261116_f6_home_v2.sql.

create table if not exists public.user_homes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"version":2,"rooms":[],"purchases":[],"wallStages":{},"logs":[],"residences":[{"id":"residence-primary","name":"Minha casa","type":"atual"}],"spaces":[],"projects":[]}'::jsonb,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint user_homes_data_version check (
    jsonb_typeof(data) = 'object' and data->>'version' in ('1','2')
    and jsonb_typeof(data->'rooms') = 'array'
    and jsonb_typeof(data->'purchases') = 'array'
    and jsonb_typeof(data->'wallStages') = 'object'
    and jsonb_typeof(data->'logs') = 'array'
    and (
      data->>'version' = '1'
      or (
        jsonb_typeof(data->'residences') = 'array'
        and jsonb_typeof(data->'spaces') = 'array'
        and jsonb_typeof(data->'projects') = 'array'
      )
    )
  )
);

alter table public.user_homes enable row level security;

-- Defesa em profundidade: nenhum usuário anônimo acessa as informações da casa.
revoke all on table public.user_homes from anon;
revoke all on table public.user_homes from authenticated;
grant select, insert, update, delete on table public.user_homes to authenticated;

-- A RLS é aplicada em cada operação. UPDATE tem USING e WITH CHECK.
drop policy if exists "myhouse_select_own" on public.user_homes;
create policy "myhouse_select_own" on public.user_homes for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "myhouse_insert_own" on public.user_homes;
create policy "myhouse_insert_own" on public.user_homes for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "myhouse_update_own" on public.user_homes;
create policy "myhouse_update_own" on public.user_homes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "myhouse_delete_own" on public.user_homes;
create policy "myhouse_delete_own" on public.user_homes for delete to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.user_homes is 'Um documento de planejamento doméstico por conta. RLS obrigatório.';
