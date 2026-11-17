\set ON_ERROR_STOP on
-- F6.8: em PostgreSQL descartável do CI. Nunca aponta para Supabase real.
-- Valida a política SQL F6.7 usando identidades e projetos sintéticos.
create schema auth;
create schema storage;
create role authenticated nologin;
create role anon nologin;

-- Simulam apenas os helpers auth.uid() e storage.foldername() de Supabase.
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid
$$;
create function storage.foldername(path text) returns text[] language sql immutable as $$
  select (string_to_array(path,'/'))[1:array_length(string_to_array(path,'/'),1)-1]
$$;

create table public.user_homes(
  user_id uuid primary key,
  data jsonb not null
);
alter table public.user_homes enable row level security;
create policy myhouse_select_own on public.user_homes for select to authenticated
  using (user_id = (select auth.uid()));

create table storage.buckets (
  id text primary key, name text not null, public boolean not null,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id bigint generated always as identity primary key,
  bucket_id text not null,
  name text not null
);
alter table storage.objects enable row level security;
grant usage on schema public,auth,storage to authenticated;
grant select on public.user_homes to authenticated;
grant select,insert,delete on storage.objects to authenticated;
grant usage on schema storage to anon;
grant select on storage.objects to anon;
grant usage, select on sequence storage.objects_id_seq to authenticated;

insert into public.user_homes(user_id,data) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
   '{"version":2,"projects":[{"id":"projeto-a"}]}'::jsonb),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
   '{"version":2,"projects":[{"id":"projeto-b"}]}'::jsonb);

-- Omitir segredos e dados reais; objetos sintéticos preexistentes.
insert into storage.objects(bucket_id,name) values
 ('myhouse-project-files','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/projeto-a/foto-a.jpg'),
 ('myhouse-project-files','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2/projeto-b/foto-b.jpg');

-- Importa O MESMO arquivo de Storage que será usado no ambiente Supabase.
\ir ../migrations/20261116_f67_project_files_private_storage.sql

do $$
begin
  if not exists(
    select 1 from storage.buckets
    where id='myhouse-project-files' and public=false
      and file_size_limit=8388608
      and allowed_mime_types @> array['application/pdf','image/jpeg','image/png','image/webp','text/plain']::text[]
  ) then raise exception 'FAIL: bucket não é privado ou limites diferem'; end if;
  if (select count(*) from pg_policies
      where schemaname='storage' and tablename='objects'
        and policyname in ('myhouse_files_read','myhouse_files_insert','myhouse_files_delete'))<>3
  then raise exception 'FAIL: políticas Storage ausentes'; end if;
end $$;

-- Identidade A: lê objeto próprio, insere no próprio projeto, exclui apenas seus objetos.
begin;
set local role authenticated;
set local request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
do $$
declare visible_count int; deleted_count int;
begin
  select count(*) into visible_count from storage.objects where bucket_id='myhouse-project-files';
  if visible_count<>1 then raise exception 'FAIL: conta A deve ver só o seu arquivo, viu %',visible_count; end if;
  if (select count(*) from public.user_homes)<>1
    then raise exception 'FAIL: conta A vê casas de outra conta'; end if;

  insert into storage.objects(bucket_id,name) values
    ('myhouse-project-files','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/projeto-a/novo.pdf');

  begin
    insert into storage.objects(bucket_id,name) values
      ('myhouse-project-files','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2/projeto-b/invasao.pdf');
    raise exception 'FAIL: conta A conseguiu gravar no projeto da B';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into storage.objects(bucket_id,name) values
      ('myhouse-project-files','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/projeto-fantasma/nao.pdf');
    raise exception 'FAIL: conta A conseguiu gravar fora dos próprios projetos';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into storage.objects(bucket_id,name) values
      ('outro-bucket','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/projeto-a/nao.pdf');
    raise exception 'FAIL: conta A conseguiu gravar em bucket não autorizado';
  exception when insufficient_privilege then null;
  end;

  delete from storage.objects
    where name='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2/projeto-b/foto-b.jpg';
  get diagnostics deleted_count=row_count;
  if deleted_count<>0 then raise exception 'FAIL: A excluiu objeto da B'; end if;

  delete from storage.objects
    where name='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/projeto-a/novo.pdf';
  get diagnostics deleted_count=row_count;
  if deleted_count<>1 then raise exception 'FAIL: A não conseguiu excluir arquivo próprio'; end if;

  begin
    update storage.objects set name='alterado'
      where name='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/projeto-a/foto-a.jpg';
    raise exception 'FAIL: política permitiu UPDATE não previsto';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;

-- Identidade B: lê apenas o seu objeto, não vê A, pode gravar no próprio projeto.
begin;
set local role authenticated;
set local request.jwt.claim.sub='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
do $$
begin
  if (select count(*) from storage.objects where bucket_id='myhouse-project-files')<>1
    then raise exception 'FAIL: conta B vê arquivo da A'; end if;
  if (select count(*) from public.user_homes)<>1
    then raise exception 'FAIL: conta B vê casa da A'; end if;
  insert into storage.objects(bucket_id,name) values
    ('myhouse-project-files','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2/projeto-b/anexo.pdf');
end $$;
commit;

-- Sem JWT e com papel anon: políticas concedidas somente a authenticated.
begin;
set local role anon;
do $$
begin
  if (select count(*) from storage.objects)<>0
    then raise exception 'FAIL: papel anon leu objetos privados'; end if;
end $$;
rollback;

-- O teste acima usou RLS de verdade: validar que a execução é habilitada.
do $$
begin
  if not exists(select 1 from pg_class where oid='storage.objects'::regclass and relrowsecurity)
  then raise exception 'FAIL: RLS desativada'; end if;
  if (select count(*) from storage.objects where bucket_id='myhouse-project-files')<>3
  then raise exception 'FAIL: teste apagou objetos de outras contas'; end if;
end $$;
select 'PASS: 2 identidades sintéticas, privacidade, INSERT, SELECT, DELETE e UPDATE negado' as result;
