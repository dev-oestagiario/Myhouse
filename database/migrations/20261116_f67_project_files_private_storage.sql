-- Myhouse F6.7 — migração PREPARADA, NÃO executar em produção antes do gate F6.0/F6.8.
-- Pré-requisito: user_homes com JSONB V2, RLS ativa e backup verificado.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('myhouse-project-files','myhouse-project-files',false,8388608,
  array['application/pdf','image/jpeg','image/png','image/webp','text/plain']::text[])
on conflict (id) do update set public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

-- Autoriza apenas objetos cujo primeiro segmento é o auth.uid() e cujo segundo
-- segmento referencia projeto da própria conta no documento user_homes.
drop policy if exists "myhouse_files_read" on storage.objects;
create policy "myhouse_files_read" on storage.objects for select to authenticated
using (
  bucket_id='myhouse-project-files'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists (select 1 from public.user_homes h
    where h.user_id=(select auth.uid())
      and exists (select 1 from jsonb_array_elements(
        case when jsonb_typeof(h.data->'projects')='array' then h.data->'projects' else '[]'::jsonb end
      ) as p where p->>'id'=(storage.foldername(name))[2]))
);
drop policy if exists "myhouse_files_insert" on storage.objects;
create policy "myhouse_files_insert" on storage.objects for insert to authenticated
with check (
  bucket_id='myhouse-project-files'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists (select 1 from public.user_homes h
    where h.user_id=(select auth.uid())
      and exists (select 1 from jsonb_array_elements(
        case when jsonb_typeof(h.data->'projects')='array' then h.data->'projects' else '[]'::jsonb end
      ) as p where p->>'id'=(storage.foldername(name))[2]))
);
drop policy if exists "myhouse_files_delete" on storage.objects;
create policy "myhouse_files_delete" on storage.objects for delete to authenticated
using (
  bucket_id='myhouse-project-files'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists (select 1 from public.user_homes h
    where h.user_id=(select auth.uid())
      and exists (select 1 from jsonb_array_elements(
        case when jsonb_typeof(h.data->'projects')='array' then h.data->'projects' else '[]'::jsonb end
      ) as p where p->>'id'=(storage.foldername(name))[2]))
);
-- Nenhuma política UPDATE, nenhuma chave secret, nenhum public bucket.
-- Validar SELECT/INSERT/DELETE com 2 contas no gate F6.8.
