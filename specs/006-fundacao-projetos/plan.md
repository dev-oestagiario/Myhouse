# Plan — F6.0 Fundação dos projetos

## Constituição aplicada
Reutilizar domínio existente, preservar histórico, não introduzir dependências sem necessidade e não confundir 3D ilustrativo com levantamento técnico. Aplicar as diretrizes de AGENTS.md.

## Arquitetura

`src/types.ts`: tipos Residence, Space e Project, mantendo WorkLog, Purchase e Room. `Room` é a única fonte da geometria.

`src/domain/homeMigration.ts`: funções puras `migrateHome(input:unknown):HomeData`, `makeDefaultResidence()`, `makeSpaceForRoom(room)` e `reconcileSpaces(home)`. Responsabilidade: importar V1, validar V2, garantir vínculo interno por sala e não descartar referências inválidas.

`src/data.ts`: `initialHome.version=2`, `validateHome` encaminha ao migrador, `loadHome` deixa erro visível em vez de apagar sem aviso. Reutilizar o método de validação no AuthGate, rascunhos e importação JSON.

`src/App.tsx`: manter Space coerente após criação, edição e exclusão de Room; impedir remoção de cômodo referenciado por projeto. Sem CRUD novo de projetos em F6.0.

`database/schema.sql`: instalação nova usa V2, valida ambas as versões temporariamente; `database/migrations/20261116_f6_home_v2.sql`: upgrade transacional de constraint, preservando user_homes e políticas RLS.

`.github/workflows/scan-quality.yml`: validar pull requests contra develop sem Android; manter a build automática exclusiva de main.

## Ordem de rollout obrigatória

1. Desenvolver e testar F6.0 em PR para develop.
2. Realizar backup e teste controlado do SQL em Supabase de staging.
3. Confirmar leitura e escrita com registros V1 e V2, contas distintas e conflito de revisão.
4. Só depois autorizar aplicação da migration em produção (amplia CHECK para ambas versões, sem converter registros de forma destrutiva).
5. Somente depois do banco compatível, considerar integrar o marco aprovado à main e publicar APK.

## Reversão

- Reverter código/UI para a versão anterior somente após garantir que não há documento V2 inacessível ao código V1.
- Não reverter constraint do banco para aceitar exclusivamente V1 se houver documentos V2.
- Restaurar snapshot/versionamento em caso de falha de migração real; nunca executar DELETE/TRUNCATE/UPDATE em massa sem backup.

## Evidência mínima

Testes Vitest de migração e invariantes, Playwright para funções legadas e edição de cômodos, npm run build e revisão do PR. Testes reais de Supabase não são substituídos por mocks e ficam como gate explícito.
