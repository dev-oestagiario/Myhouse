# F6.1 — Plan: domínio, UI e persistência

## Arquitetura
- `src/types.ts`: `Project.archivedAt?` opcional, compatível com documentos v2 existentes.
- `src/features/projects/projectDomain.ts`: funções puras para projeto novo, atualização, arquivamento/reativação, exclusão e dinheiro em centavos. Sem React/Supabase; retorna `HomeData` válido.
- `src/features/projects/ProjectWorkspace.tsx`: tela com resumo, filtros, cards, detalhe e modal de CRUD; a única mutação passa por `onChange` e pela sincronização já existente em App.
- `src/shared/Modal.tsx`: extrair o mesmo diálogo acessível atualmente utilizado por compras, para não duplicar o comportamento.
- `src/features/projects/projects.css`: UX responsiva dentro do tema azul atual.
- `src/App.tsx`: novo item Projetos no menu e acesso rápido pelo painel.
- `src/domain/homeMigration.ts`: validar o campo opcional de arquivamento.

## Segurança, privacidade e integridade
Dados novos permanecem dentro do documento `user_homes.data` e continuam protegidos pela RLS existente. Validar referências na camada de domínio e na importação, não conceder acesso entre contas, não criar storage externo. Exclusão tem confirmação explícita; arquivamento é reversível. Fluxo não toca os registros existentes em projetos diferentes.

## Testes
1. Vitest para centavos, tipo/status, duplicidade, atualização e arquivamento.
2. Playwright com Supabase mock: Deck sem cômodo, depois vincular sala, alterar situação, listar/filtrar, arquivar e excluir.
3. Axe em Projetos, viewport mobile sem rolagem horizontal.
4. CI em PR para develop; Android job ignorado.

## Gate de lançamento
A F6.0 introduziu `HomeData.version:2`; o banco atual pode ter CHECK `version=1`. PRs para develop são seguros **somente** como staging. Aplicar e testar `database/migrations/20261116_f6_home_v2.sql` em ambiente controlado antes de promover uma release à main, para evitar falhas de sincronização na conta real.
