# Tasks — F6.0 Fundação de dados

| ID | Dependência | Tarefa | Prova |
| --- | --- | --- | --- |
| F6.0-T01 | — | Criar branch develop e mover o roadmap aprovado para develop sem APK | GitHub PR #6, base develop |
| F6.0-T02 | T01 | Criar tipos Version 2 (Residence, Space, Project) | TypeScript build |
| F6.0-T03 | T02 | Implementar migrador puro V1 -> V2, normalização de espaços e validação de referências | Vitest com backup V1 e V2 |
| F6.0-T04 | T03 | Atualizar carga/importação e estado inicial para V2 | Vitest + Playwright |
| F6.0-T05 | T03 | Criar/manter vínculos Room-Space na edição e bloquear remoção referenciada | E2E e testes puros |
| F6.0-T06 | T02 | Preparar schema novo e migration SQL aditiva, sem execução em produção | Revisão do SQL e ensaio em staging pendente |
| F6.0-T07 | T04–T05 | Adicionar checks para PR develop sem publicação Android | GitHub Actions react/e2e |
| F6.0-T08 | T03–T07 | Revisar compatibilidade, riscos e critérios de deploy; PR para develop | Relatório CI e limitações descritas |
| F6.0-GATE | T08 | Executar migração e testes reais em staging, autorizar SQL produção antes de promover à main | PENDENTE de autorização e evidência |

## Pontos de revisão

- Incompatibilidade V1/V2 no `user_homes_data_version` até aplicar SQL.
- Projetos e cenários existentes em V2 não podem ser apagados por normalização de espaços.
- Compras sem cômodo e registros de obras antigos continuam válidos.
- Validação de nomes, referências e orçamentos centavos sem arredondamento oculto.
- O PR não pode disparar uma Release Android nem modificar a main.

## Definição de pronto
T01–T08 podem ser considerados implementados após CI verde e revisão; o Gate exige teste/autorizações em Supabase real. Não marcar gate concluído com apenas CI.
