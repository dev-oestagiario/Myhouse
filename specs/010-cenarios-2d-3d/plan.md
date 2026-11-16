# F6.4 — Plano técnico

## Princípios
Spec Kit: preservar a planta real, reutilizar ferramentas de edição já validadas, testar isolamento e garantir reversibilidade. Em nenhuma operação a proposta se torna automaticamente a realidade física da casa.

## Modelo de dados
`HomeData.version = 2` é mantido para compatibilidade com constraint SQL da F6.0. Novo campo `scenarios: ProjectScenario[]` com:
- `ProjectScenario`: `id`, `projectId`, `name`, `description`, `rooms: Room[]`, `revisions: ScenarioRevision[]`, `createdAt`, `updatedAt`.
- `ScenarioRevision`: `id`, `savedAt`, `label`, `rooms: Room[]`.

As geometrias são snapshots deliberados e separados de `HomeData.rooms`. Elas podem manter IDs originais para comparação. Novos IDs não colidem com cômodos reais. Caso a casa real mude posteriormente, os cenários antigos continuam com as medidas anteriormente planejadas; a atualização com a planta real é uma ação explícita, reversível e confirmada.

## Domínio e persistência
- `src/domain/scenarioValidation.ts`: validação de estrutura, IDs únicos, vínculo com projeto, revisão, limites e geometria.
- `src/features/projects/scenarioDomain.ts`: criação por cópia do projeto ou vazio, duplicação, edição de quarto, adicionar/remover quarto, renomear, excluir, recuperar versão, substituir com a planta atual.
- `src/domain/homeMigration.ts`: default `scenarios: []` para V1 e V2 antigo, sem descartar cenários inválidos em backups corrompidos.
- `src/features/projects/projectDomain.ts`: não permitir excluir projeto com cenário vinculado.
- Sem novas tabelas; salvar pelo mecanismo `user_homes.data` e revisão otimista existentes. RLS inalterada.

## Interface
- `src/features/projects/ScenarioWorkspace.tsx`: biblioteca de propostas, novo/duplicar/editar/excluir, visualização 3D, mapas 2D, comparação antes/depois, lista de espaços e histórico.
- `src/plan/PlanEditor.tsx`: reutilizado via `rooms/onSelect/onSave` vinculados ao cenário, sem alteração do editor da casa atual.
- `src/plan/HouseModel.tsx`: reutilizado com lista de rooms real ou planejada, seleção independente.
- `src/features/projects/ProjectWorkspace.tsx`: nova aba Cenários 2D/3D.
- `src/features/projects/scenarios.css`: responsividade e design azul.
- Undo/Redo contínuo de movimentos não é parte do modelo; há restauração de versões após salvamentos completos. Interiores e catálogo 3D são da F6.5.

## Testes
- Vitest: isolamento, polígonos e vãos, validação, novas geometrias, snapshot duplicado, restauração, limite, compatibilidade de backup, arquivo de projeto.
- Playwright com Supabase simulado: criar/editar/projetar/comparar/voltar/duplicar; projeto vazio; desktop e viewport móvel.
- Regressão da planta real, import/export, tarefas e compras.
- Sem hardware real nesta fase; não declarar desempenho do app Android sem teste físico.

## Publicação
PR para `develop` com CI verde. Não aplicar migração na produção sem gate SQL da F6.0; não promover para main ou gerar APK antes do marco F6 consolidado.
