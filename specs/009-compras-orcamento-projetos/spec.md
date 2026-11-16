# F6.3 — Specify: compras e orçamento por projeto

**Base:** F6.0–F6.2 integradas na `develop`, banco Supabase de produção ainda não atualizado para `HomeData V2`.
**Objetivo:** planejar materiais e serviços no mesmo projeto, ligar compras a tarefas existentes, comparar custos previstos e efetivamente pagos sem duplicar compras na lista global.

## Jornadas de usuário
1. Projeto "Renovar sala" > Compras e orçamento > "Adicionar compra" > informar item, quantidade, unidade, preço previsto e, opcionalmente, tarefa.
2. A compra aparece no projeto **e na lista geral**, com mesmo ID e sem cópias. Também é possível cadastrar na lista geral e vincular a um projeto depois.
3. Registrar status (preciso, pesquisando, orçado, comprado, recebido, instalado, cancelado) e preço realmente pago, mantendo distinção de estimativa e gasto.
4. Registrar cotações de fornecedores (preço unitário, link opcional) para comparar alternativas; a cotação **não altera** automaticamente o custo previsto.
5. Adicionar aos serviços os valores previstos e efetivamente pagos de mão de obra, sem contabilizar materiais novamente.
6. Definir reserva percentual de contingência e comparar total projetado com meta de orçamento do projeto.
7. Arquivar um projeto sem excluir compras e históricos. Não permitir excluir um projeto enquanto houver compras vinculadas.

## Requisitos funcionais
- **RF6.3.01** `Purchase` mantém os campos legados e acrescenta `projectId?`, `taskId?`, `unit?`, `status?`, `supplier?`, `actualUnitPriceCents?`, `quotes?`, com compatibilidade para backups antigos.
- **RF6.3.02** Compra opcionalmente associada a projeto (e tarefa do mesmo projeto); projetos sem cômodo e compras globais continuam possíveis.
- **RF6.3.03** Dados da compra compartilham ID e fluxo de CRUD entre lista geral e projeto, sem cópias.
- **RF6.3.04** Valores financeiros de novas operações validados em centavos inteiros; quantidade positiva; total de linha arredondado ao centavo.
- **RF6.3.05** Compra marcada como comprada sem preço real preenchido **não** será considerada despesa efetivamente registrada, evitando apresentar estimativa como gasto.
- **RF6.3.06** Gastos reais consideram somente compra no estado comprado/recebido/instalado com preço real; serviços com custo real informado, independentemente de conclusão operacional.
- **RF6.3.07** Cotações com fornecedor, preço em centavos e URL opcional; listar e excluir cotações; não alterar a estimativa automaticamente.
- **RF6.3.08** Custos de serviços na tarefa são destinados a mão de obra; materiais são registrados como compras. Cálculo financeiro soma compras e serviço uma vez.
- **RF6.3.09** Contingência inteira de 0% a 50% sobre custos **previstos** de materiais e serviços. Comparar com orçamento-meta sem inferir impostos ou taxas não cadastrados.
- **RF6.3.10** Proteção de integridade: vínculos de tarefa e projeto validáveis na importação; não excluir projeto/ambiente com compras dependentes sem corrigir vínculos.
- **RF6.3.11** Projeto arquivado é somente leitura; tarefas, compras e cotações permanecem associadas.
- **RF6.3.12** Filtros de compras por situação no projeto e indicador visível de projeto na lista global.

## Requisitos não funcionais
- **RNF6.3.01** UI azul coerente, responsiva (desktop e Android), sem depender do 3D.
- **RNF6.3.02** Funções financeiras puras isoladas, cálculos em centavos e testes Vitest/Playwright.
- **RNF6.3.03** Dados privados continuam protegidos pela RLS do documento atual; não introduzir chamadas externas para estimativa.
- **RNF6.3.04** Não publicar APK nesta etapa. Git Flow: PR apenas para `develop`, aguardando gate SQL da F6.0 antes de liberar produção.
- **RNF6.3.05** Não tratar cotação e preços informados como valores verificados; sem marketplace ou transações de pagamento.

## Critérios de aceite
- Projeto sala, material de 2 unidades a R$ 79,90 = R$ 159,80 previsto. Mudar status para comprado **sem** preço pago mantém confirmado em R$ 0. Informar R$ 75,50 por unidade gera R$ 151,00 confirmado.
- Projeto com mão de obra prevista R$ 200,00 e real R$ 180,00 gera orçamento projetado com materiais, sem duplicar compra.
- Reserva de 10% sobre R$ 159,80 gera R$ 15,98; diferença para orçamento-meta recalculada.
- Vincular material à tarefa correta e rejeitar referência a tarefa de outro projeto.
- Cotação registrada não substitui preço previsto sem confirmação do usuário.
- Salvar compra pelo painel de projeto aparece na lista global com o mesmo ID e vice-versa.
- Importar V1 e V2 legados sem perder compras, tarefas e plantas.
- CI: Vitest, build React, Playwright desktop/mobile, acessibilidade e regressão.

## Fora de escopo
- Pagamentos in-app, integração com fornecedores, cotações automáticas e cobrança de mão de obra.
- Arquivos de notas fiscais, compartilhamento e calendário geral (F6.7).
- Cenários de planta antes/depois e modelos de móveis (F6.4/F6.5).
