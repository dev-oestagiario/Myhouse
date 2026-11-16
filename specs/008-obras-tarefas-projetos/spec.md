# F6.2 — Especificação: tarefas e serviços de projetos

**Status:** desenvolvimento para `develop`, sem publicação de APK nem migração Supabase de produção.
**Base:** F6.0 fundação de dados, F6.1 gerenciamento de projetos.

## Problema
A área Obras da versão anterior acompanha somente etapas fixas de paredes (raspagem, reparo, lixamento, preparação e pintura). Não há como planejar todas as atividades de uma mudança ou reforma — contratar serviços, retirar móveis, instalar luminárias, construir um deck — em um projeto com prioridades, prazos e dependências.

## Objetivo
Cadastrar e acompanhar **tarefas e serviços livres por projeto**, com checklists, situação, prioridade, ambiente opcional, prazo, dependências e histórico. Preservar integralmente a tela Obras antiga e seus dados.

## Jornadas
1. Criar projeto de renovação da sala e abrir detalhes > "Tarefas e serviços" > "Nova tarefa". Informar título, descrição, tipo, status, prioridade e prazo.
2. Opcionalmente vincular o serviço a um ambiente pertencente ao projeto, mesmo quando o projeto tem múltiplos ambientes.
3. Montar checklist de execução com quantas etapas forem necessárias (até 100 por tarefa); marcar/desmarcar as etapas e acompanhar a contagem.
4. Marcar dependência de outra tarefa do **mesmo projeto**. Não permitir concluir enquanto algum pré-requisito estiver pendente; não permitir ciclos.
5. Alternar o estado de cada tarefa e acompanhar indicadores de total, andamento, conclusão e atraso.
6. Editar/excluir com confirmação; não excluir tarefa referenciada por dependências. Arquivar um projeto torna tarefas somente leitura e reativá-lo libera alterações.
7. Dados continuam sincronizados em `user_homes.data` e no backup JSON, sem alterações nas compras e logs legados.

## Requisitos funcionais
- **F6.2-RF01** CRUD de tarefa e serviço com título, descrição opcional, tipo, situação, prioridade, data prevista opcional, ambiente opcional do projeto.
- **F6.2-RF02** Checklist editável com IDs estáveis, exclusão de etapas, marcação individual e percentual concluído; não confundir checklist completo com tarefa concluída.
- **F6.2-RF03** Dependências por IDs de tarefas do mesmo projeto, sem duplicidade, autorreferência ou ciclo.
- **F6.2-RF04** Estado `concluido` bloqueado quando dependências não concluídas; retroceder dependência concluída também não pode invalidar tarefas seguintes.
- **F6.2-RF05** Progresso global do projeto: número de tarefas concluídas / total. Exibir atividades em andamento e tarefas vencidas não concluídas.
- **F6.2-RF06** Histórico por tarefa: criação, atualização, status e marcações de checklist, em ordem cronológica.
- **F6.2-RF07** Arquivar projeto mantém tarefas sem edição; projeto com tarefas não pode ser excluído até desvinculação/exclusão explícita.
- **F6.2-RF08** Não permitir remover do projeto um ambiente referenciado por tarefa. Não permitir apagar tarefa com dependentes.
- **F6.2-RF09** Importação de HomeData V1 e V2 anteriores à F6.2 sem `workTasks` cria lista vazia preservando todas as demais informações.
- **F6.2-RF10** Compra, etapas fixas de parede, histórico de obras e plantas existentes permanecem independentes e sem migração destrutiva.

## RNF
- **F6.2-RNF01** Checklists, formulários, seleção de situação e histórico acessíveis sem canvas 3D, em dispositivos móveis e teclado.
- **F6.2-RNF02** Todas as regras de integridade são aplicadas também à importação do backup JSON, não apenas na interface.
- **F6.2-RNF03** Histórico privado, vinculado ao mesmo usuário e documento Supabase com RLS pré-existente.
- **F6.2-RNF04** Mostrar "Aguarde a sincronização"; não afirmar que a nuvem salvou antes de confirmar.
- **F6.2-RNF05** Sem APIs novas, IA nem dependências adicionais; CI React/Vitest/Playwright e sem geração de APK.

## Critérios de aceite
- Em "Renovar sala": cadastrar "Pintar paredes", tipo Serviço, prioridade Alta, prazo, 2 etapas; marcar uma etapa -> 1/2; mudar estado Concluído -> progresso 100% somente se requisitos satisfeitos.
- Projeto sem ambiente ("Deck no quintal"): criar serviços independentes da planta atual.
- A depende de B -> não concluir A até concluir B. Não criar ciclo A->B->A.
- Excluir projeto com tarefas -> erro e opção de arquivar; excluir cômodo com tarefa vinculada ao projeto -> mantida proteção existente.
- Arquivar/reativar preserva todos os serviços e histórico.
- V1 e V2 F6.1 continuam importáveis sem dados descartados.
- Vitest, build React/TypeScript, E2E/axe e viewport móvel aprovados no PR para develop.

## Fora de escopo
- Compras por tarefa, comparativo financeiro, materiais e fornecedores (F6.3).
- Editor de cenários 2D/3D (F6.4), agenda geral e atribuição de responsáveis (F6.7).
- Tarefas sem projeto, colaborações em tempo real e assinatura de APK nesta fase.
