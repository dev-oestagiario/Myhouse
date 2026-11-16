# Specify — F6.0 Fundação dos projetos

**Status:** aprovado para implementação de fundação, sem liberação em produção.
**Roadmap:** docs/PLANO_PROJETOS_REFORMAS_3D.md
**Usuário:** quem quer criar projetos futuros de mudança e reforma sem perder compras/obras já registradas.

## Objetivo

Evoluir o armazenamento residencial de `HomeData V1` para `HomeData V2`, preparando conceitos de residência, espaço e projeto, enquanto o aplicativo atual permanece utilizável. CRUD e telas de projetos são escopo da F6.1.

## Requisitos funcionais

- **F6-RF01:** importar backup V1 e manter sem alterações de valor as listas de cômodos, compras, etapas, aberturas de parede, geometria irregular e logs.
- **F6-RF02:** versão V2 contém residências e espaços com IDs estáveis, projeto sem obrigatoriedade de cômodo e referência opcional a vários espaços.
- **F6-RF03:** cada Room permanece dono da sua geometria; cada Space interno aponta para um único Room, não duplica planta.
- **F6-RF04:** criar/editar cômodo deve sincronizar Space; exclusão de Room vinculado a Project é bloqueada até desvinculação explícita.
- **F6-RF05:** importar/validar V2 rejeita projetos com IDs duplicados, vínculos cruzados ou inválidos, valores financeiros não-inteiros ou dados corrompidos.
- **F6-RF06:** reimportar V2 válido é idempotente; backups V1 ainda são aceitos.
- **F6-RF07:** não exigir que o usuário faça qualquer migração manual de registros individuais quando a versão aprovada for ativada.

## Requisitos não funcionais

- **F6-RNF01:** RLS de user_homes por usuário permanece sem alterações; o banco aceita V1 e V2 durante a transição.
- **F6-RNF02:** migração SQL transacional, aditiva, com checklist, backup e caminho de rollback controlado; não executar automaticamente no banco ativo nesta etapa.
- **F6-RNF03:** nenhum push de fases para main; PR e CI direcionados a develop, preservando o APK v0.1.17.
- **F6-RNF04:** não sobrescrever dados ilegíveis com um documento vazio.
- **F6-RNF05:** todas as regras puras testáveis via Vitest sem rede; fluxos existentes testados em Playwright usando Supabase simulado.

## Fora de escopo

Interface CRUD de projetos, tarefas universais, compras por projeto, mobiliário 3D, compartilhamento, áreas externas com modelagem 3D e novas APIs de IA.

## Critérios de aceite

1. HomeData V1 com sala em L, vão de porta, tintas compradas e log de parede -> V2 com campos antigos idênticos e espaço correspondente.
2. V2 com dois projetos válidos referenciando a sala -> round-trip JSON sem perda.
3. Projeto referindo espaço inexistente ou ambiente de outra residência -> erro antes de salvar.
4. Novo cômodo -> novo Space estável; renomeação mantém o vínculo e atualiza nome.
5. Excluir cômodo em projeto -> rejeição e mensagem de ação; sem perda silenciosa.
6. npm run test; npm run build; npm run e2e com CI verde na branch de revisão.
7. Migration SQL documentada e não executada em produção nesta fase.

## Riscos

Constraint Supabase V1 bloqueia gravações V2 até aplicar migration. Por isso esta branch NÃO deve ser mesclada na main antes do gate SQL. A RLS atual não permite colaboração entre usuários e não será ampliada. O modelo de espaço externo ainda é apenas metadado de planejamento, não objeto 3D.
