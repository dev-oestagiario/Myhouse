-- F6.0: preparar HomeData V2 sem alterar registros V1 existentes.
-- APLICAR somente com backup e validação no projeto Supabase correto.
-- Segurança: a tabela e políticas RLS permanecem intactas; esta migration só amplia o CHECK.
-- Pós-condição: V1 e V2 continuam aceitos simultaneamente durante o rollout.
begin;

alter table public.user_homes drop constraint if exists user_homes_data_version;
alter table public.user_homes add constraint user_homes_data_version check (
  jsonb_typeof(data) = 'object'
  and data->>'version' in ('1','2')
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
) not valid;

alter table public.user_homes validate constraint user_homes_data_version;

commit;

-- Verificação APÓS deploy (consulta somente leitura):
-- select data->>'version' as versao, count(*) from public.user_homes
-- group by data->>'version' order by 1;
--
-- Rollback controlado: só voltar a aceitar exclusivamente V1 se NENHUMA linha V2 existir.
-- Não converter dados V2 para V1 sem exportação e decisão explícita.
-- Não executar DROP TABLE, DELETE ou TRUNCATE.
