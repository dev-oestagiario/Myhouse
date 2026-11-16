# F6.3 — Plano técnico

## Decisão de arquitetura
Evoluir a entidade `Purchase` em vez de criar outra tabela/lista de compras: itens globais e vinculados compartilham IDs. O campo legado `unitPrice` permanece em reais (compatibilidade); novas validações de entrada verificam o centavo, com funções de cálculo sobre inteiros. Preço real é `actualUnitPriceCents`; nenhum gasto real é inferido da estimativa.

## Componentes
1. `src/types.ts`: campos opcionais `Purchase`, `Project.contingencyPercent`, custos opcionais de `ProjectTask`, `PurchaseQuote`.
2. `src/domain/homeMigration.ts` e `src/domain/taskValidation.ts`: validar novas referências e valores de entidades opcionais sem rejeitar dados de versões anteriores.
3. `src/features/projects/budgetDomain.ts`: CRUD de compra (chamado tanto pela lista global quanto pelo projeto), preços exatos, status, cotações, contingência e serviço.
4. `src/features/projects/PurchaseEditor.tsx`: formulário **compartilhado** e vinculação opcional por projeto/tarefa.
5. `src/features/projects/ProjectBudget.tsx` e `budget.css`: orçamento consolidado, compras, serviços, cotações e edição da reserva.
6. `src/features/projects/ProjectWorkspace.tsx`: abas Tarefas e Compras/Orçamento, resumo de metas.
7. `src/App.tsx`: lista de compras existente reutiliza o mesmo editor/domínio; a compra mostra projeto e valor pago quando conhecido.
8. `src/features/projects/budgetDomain.test.ts` e `tests/e2e/myhouse.spec.ts`: regressões e fluxos financeiros.

## Integridade
- Total previsto = material previsto + mão de obra prevista + contingência calculada. Item cancelado não entra no orçamento.
- Gasto registrado = compras em situação comprada/recebida/instalada com preço pago explícito + custo real de serviços explicitamente informado.
- Metas são comparadas com a projeção, não com gasto real parcial. **Não** afirmar que 0 confirmado significa que o usuário não gastou.
- Excluir projeto com compras/tarefas bloqueado. Desvincular ambientes em uso pelas compras bloqueado.
- Arquivar projeto mantém compras e serviços vinculados.
- Guardar todos os valores persistidos por meio do mecanismo `user_homes.data` atual, sem alterar RLS.

## Release
Desenvolver e testar em branch de recurso e integrar apenas na `develop`. SQL de compatibilidade `HomeData V2` está documentado na F6.0, não executado no banco de produção. Aplicação controlada e teste com backups reais continuam gate para promover F6.x à `main`. Não gerar APK por fase.

## Riscos
Custos de mão de obra e compra podem ser contabilizados duas vezes se o usuário registrar materiais como mão de obra; rotular explicitamente. O preço real desconhecido não é zero gasto: UI informa falta de registro. Quantidade fracionada arredondada por total de linha ao centavo; validar em testes. Cotação não comprova preço atual.
