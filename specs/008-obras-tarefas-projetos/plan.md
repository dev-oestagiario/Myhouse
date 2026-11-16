# F6.2 — Plano técnico

## Princípios
Manter a geometria de cômodos independente do planejamento, preservar todos os registros de obras legados, validar referências antes de persistir e não transformar o frontend em ferramenta de engenharia.

## Persistência
`HomeData V2` recebe `workTasks: ProjectTask[]`. Não aumentar `version` para 3: o banco valida a versão 2 e permite campos adicionais no JSONB. `migrateHome` insere array vazio quando recebe V1 ou V2 anterior a esta etapa sem `workTasks`, mas rejeita tipos inválidos. A migração SQL da F6.0 continua obrigatória antes da publicação de F6.x no Supabase de produção.

### Entidades
- `ProjectTask`: id, projectId (obrigatório nesta etapa), spaceId|null, kind, title, description, status, priority, dueDate|null (YYYY-MM-DD local), checklist[], dependsOn[], history[], createdAt, updatedAt.
- `ProjectTaskChecklistItem`: id, title, done.
- `ProjectTaskEvent`: id, occurredAt, description.
- O projeto não armazena cópias de tarefas; a lista por projeto é filtrada por `projectId`.

## Camadas
1. `src/types.ts`: contratos de tarefas.
2. `src/domain/taskValidation.ts`: validação pura de dados, IDs, datas, escopo de ambiente/projeto, dependências e ciclos; chamada pela importação.
3. `src/features/projects/taskDomain.ts`: comandos imutáveis CRUD, status, checklist e progresso, usando `validateHome`.
4. `src/features/projects/ProjectTasks.tsx`: interface com lista, filtros, estatísticas, checklist e modal de cadastro.
5. `src/features/projects/tasks.css`: visual padronizado azul com foco/responsividade.
6. `src/features/projects/ProjectWorkspace.tsx`: integra resumo e seção de tarefas. `projectDomain.ts` impede remoções que deixem referências órfãs.
7. `tests/e2e/myhouse.spec.ts`, `src/features/projects/taskDomain.test.ts`: regressões.

## Regras importantes
- Ao completar tarefa, todas as dependências devem estar concluídas.
- A exclusão de uma tarefa dependida por outra é bloqueada até remapeamento explícito.
- Remover um espaço de um projeto com tarefa vinculada é bloqueado.
- Remover um projeto com tarefas é bloqueado, sugerindo arquivamento em vez de apagar.
- Arquivar projeto conserva todas as tarefas e impede alterações até reativação.
- Checklist marcado é progresso de checklist, mas não muda automaticamente a situação da tarefa.
- Cada atualização cria evento de histórico na própria tarefa; exclusão definitiva descarta este histórico após confirmação.
- Lista de tarefas pode ser vazia; projeto pode existir sem ambiente e sem tarefas.

## Gate
1. Confirmar Vitest e TypeScript.
2. Confirmar E2E desktop/mobile: criar, editar, checklist, dependências, arquivamento e regressões existentes; axe.
3. Revisar o PR contra `develop`, mesclar sem tocar em `main`.
4. Não executar migration no Supabase sem estágio/backup/aceite do responsável. Não gerar APK até o marco aprovado de F6.
