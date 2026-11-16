# F6.1 — Specify: projetos de mudança e reforma

**Status:** em implementação, destino `develop`; produção bloqueada até o gate SQL da F6.0.

## Objetivo
Permitir que uma pessoa organize múltiplas iniciativas para sua casa — reforma da sala, decoração, mudança ou construção de um deck futuro — antes de cadastrar serviços, materiais e cenários 3D. O projeto não altera a planta existente.

## Jornadas
1. Projetos > Novo projeto > nome e descrição > tipo, situação, prioridade, orçamento opcional, ambientes opcionais > Salvar > detalhes.
2. Salvar um projeto de deck **sem cômodo**; não exigir que o ambiente já exista.
3. Associar posteriormente o projeto a um ou mais ambientes; abrir o cômodo pela visão de detalhe.
4. Filtrar por palavra-chave, tipo, situação e ativo/arquivado; abrir, editar e mudar status.
5. Arquivar sem perder dados; reativar preservando status e informações.
6. Excluir com confirmação, sem excluir cômodos, compras ou obras da residência; backups incluem projetos.

## RF
- RF6.1.01 CRUD completo de projetos, confirmação antes de exclusão definitiva.
- RF6.1.02 Projeto válido sem ambientes, com vínculo opcional a múltiplos ambientes da **mesma residência**.
- RF6.1.03 Tipo: reforma, mudança, decoração, ampliação, manutenção ou outro. Situação: ideia, planejando, aprovado, em execução, pausado, concluído ou cancelado; prioridade urgente/alta/média/baixa.
- RF6.1.04 Orçamento opcional em centavos, sem arredondamentos silenciosos; distinção explícita entre meta orçamentária e custos detalhados ainda indisponíveis.
- RF6.1.05 Arquivamento reversível via `archivedAt` não modifica `status`, e projeto arquivado requer reativação antes de editar.
- RF6.1.06 Filtros combináveis, pesquisa e ordenação por prioridade e atualização.
- RF6.1.07 Proteção de integridade: não excluir cômodo referenciado por projeto, não permitir vínculo de ambiente de outra residência, nem ID repetido.
- RF6.1.08 Preservar registros de compras, parede, plantas e histórico legados, sem duplicar.
- RF6.1.09 Dados do projeto sincronizados via mecanismo existente e incluídos na exportação/importação JSON.

## RNF
- RNF6.1.01 Mobile-first; controles utilizáveis por teclado, leitores de tela e sem 3D.
- RNF6.1.02 Sem API externa adicional, IA ou nova dependência.
- RNF6.1.03 Falha da nuvem informa estado pendente/erro existente; não dizer "salvo na nuvem" antes da confirmação.
- RNF6.1.04 Nenhuma alteração de DB/produção no PR. `user_homes_data_version` precisa aceitar versão 2 antes da promoção à main.

## Critérios de aceite
- Cadastrar projeto "Deck no quintal" sem ambiente, orçamento R$ 2.500,50; selecionar sala depois; reabrir com estado e centavos exatos.
- Arquivar, localizar no filtro Arquivados, reativar e editar sem perder data de criação.
- Alterar situação e visualizar no filtro correspondente.
- Excluir um projeto sem alterar seus cômodos/compras. O cancelamento da confirmação não exclui.
- Projeto não pode referenciar ambiente inexistente/outra residência.
- Testes Vitest e Playwright incluindo viewport mobile, axe e regressão da navegação.
- PR integrado **somente** em `develop`; sem APK nesta fase.

## Não incluído na F6.1
- Tarefas e checklists (F6.2).
- Associação de itens de compra e cálculo de custo realizado (F6.3).
- Cenários/interiores 3D (F6.4+), áreas externas completas (F6.6).
- Colaboração entre contas.
