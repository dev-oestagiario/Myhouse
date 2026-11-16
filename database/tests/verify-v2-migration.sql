\set ON_ERROR_STOP on
-- Testa em Postgres DESCARTÁVEL do GitHub Actions, nunca no Supabase real.
create table public.user_homes (
  user_id uuid primary key,
  data jsonb not null,
  revision integer not null default 1,
  constraint user_homes_data_version check (
    jsonb_typeof(data)='object' and data->>'version'='1'
    and jsonb_typeof(data->'rooms')='array'
    and jsonb_typeof(data->'purchases')='array'
    and jsonb_typeof(data->'wallStages')='object'
    and jsonb_typeof(data->'logs')='array'
  )
);
insert into public.user_homes(user_id,data)
values ('00000000-0000-4000-8000-000000000001',
  '{"version":1,"rooms":[{"id":"sala","name":"Sala"}],"purchases":[],"wallStages":{"sala:leste":{"Pintura":"concluido"}},"logs":[]}'::jsonb);
create temporary table v1_original as select data from public.user_homes
where user_id='00000000-0000-4000-8000-000000000001';
-- Aplica o mesmo SQL que será executado na migração real.
\ir ../migrations/20261116_f6_home_v2.sql
-- A reexecução é idempotente e não invalida V1 ou V2.
\ir ../migrations/20261116_f6_home_v2.sql
insert into public.user_homes(user_id,data)
values ('00000000-0000-4000-8000-000000000002',
  '{"version":2,"rooms":[],"purchases":[],"wallStages":{},"logs":[],"residences":[],"spaces":[],"projects":[],"workTasks":[],"scenarios":[],"projectFiles":[]}'::jsonb);
do $$
declare invalid_accepted boolean:=false;
begin
  if not exists (select 1 from public.user_homes where user_id='00000000-0000-4000-8000-000000000001'
    and data=(select data from v1_original)) then
    raise exception 'Falha: dados V1 foram alterados pela migração';
  end if;
  if (select count(*) from public.user_homes)<>2 then raise exception 'Falha: contagem de linhas alterada'; end if;
  begin
    insert into public.user_homes(user_id,data)
    values('00000000-0000-4000-8000-000000000003',
      '{"version":2,"rooms":[],"purchases":[],"wallStages":{},"logs":[]}'::jsonb);
    invalid_accepted:=true;
  exception when check_violation then
    null;
  end;
  if invalid_accepted then raise exception 'Falha: documento V2 incompleto foi aceito'; end if;
  begin
    insert into public.user_homes(user_id,data)
    values('00000000-0000-4000-8000-000000000004',
      '{"version":3,"rooms":[],"purchases":[],"wallStages":{},"logs":[]}'::jsonb);
    invalid_accepted:=true;
  exception when check_violation then
    null;
  end;
  if invalid_accepted then raise exception 'Falha: versão desconhecida aceita'; end if;
  if not exists(select 1 from pg_constraint
    where conrelid='public.user_homes'::regclass and conname='user_homes_data_version'
      and convalidated) then raise exception 'Falha: constraint de dados não validada'; end if;
end $$;
select data->>'version' as version, count(*) from public.user_homes group by 1 order by 1;
