# F6.4 — Especificação: cenários de planejamento 2D/3D

## Problema e objetivo
A planta `HomeData.rooms` representa a situação **atual** da residência. O usuário quer simular a reforma de uma sala, a inclusão de novos cômodos e alternativas para um projeto sem modificar esse estado real. Os recursos 2D e 3D já existentes precisam funcionar sobre versões independentes.

## Jornadas
1. Abrir projeto > aba `Cenários 2D/3D` > `Criar cenário` > copiar os cômodos reais vinculados ao projeto ou começar com uma proposta vazia.
2. Visualizar em 3D e selecionar os ambientes. Ajustar nomes, dimensões e posições sem alterar `HomeData.rooms`.
3. Abrir o editor 2D existente para modificar contornos (retângulo, L, U, vértices) e vãos de portas/janelas. Salvar no cenário, não na casa real.
4. Criar e remover espaços hipotéticos no cenário, inclusive quando não existe nenhum cômodo real no projeto (ex.: proposta inicial de deck). **Nota:** a modelagem geométrica nesta fase ainda é a volumetria de cômodos, não os recursos específicos de deck da F6.6.
5. Comparar em paralelo a planta real e a proposta, em mapas superiores 2D e modelos 3D independentes.
6. Duplicar um cenário para outra alternativa e renomear a proposta.
7. Recuperar uma revisão anterior da geometria; a versão atual é preservada antes da restauração, até o limite das últimas 12 revisões.
8. Excluir um cenário com confirmação. Excluir um projeto com cenários é bloqueado até que os cenários sejam excluídos; projetos arquivados permanecem somente leitura.

## Requisitos funcionais
- **F6.4-RF01** `HomeData.scenarios` com `id`, `projectId`, nome, descrição, lista de cópias de `Room`, histórico e datas.
- **F6.4-RF02** Cenário inicial copia apenas os cômodos vinculados ao projeto; proposta vazia é sempre possível.
- **F6.4-RF03** IDs dos cômodos reais são mantidos nas cópias para permitir identificar alterações, mas novos cômodos de proposta recebem IDs próprios, sem colidir com IDs reais.
- **F6.4-RF04** Alterações ocorrem somente em `scenario.rooms`; funções puras não modificam `home.rooms`, `spaces`, `wallStages`, `logs`, compras ou tarefas.
- **F6.4-RF05** Reutilização do editor 2D atual com `rooms/onSave` do cenário, nunca com `onSave` da planta real.
- **F6.4-RF06** Reutilização do `HouseModel` para visualização 3D da proposta e do estado atual em modo comparação.
- **F6.4-RF07** Comparação calcula cômodos adicionados/removidos/alterados sem forçar alteração de dados reais.
- **F6.4-RF08** Duplicação cria cópia estruturada e independência de geometrias; renomeação e exclusão com confirmação.
- **F6.4-RF09** Histórico de até 12 snapshots por cenário, com restauração reversível; alterações posteriores preservam o snapshot anterior.
- **F6.4-RF10** Projeto arquivado: leitura e comparação liberadas, alteração ou exclusão bloqueada.
- **F6.4-RF11** Importação de backups V1 e V2 anteriores à fase inicializa `scenarios:[]` sem tocar nos outros dados.
- **F6.4-RF12** Não permitir cenário órfão, geometrias inválidas, IDs repetidos ou histórico malformado.

## RNF
- **F6.4-RNF01** Visão desktop/mobile, com controles de toque e teclado, seleção textual e sem depender exclusivamente de imagens 3D.
- **F6.4-RNF02** Máximo de 20 cenários por projeto, 40 cômodos por cenário e 12 revisões por cenário para limitar o crescimento do JSON Supabase.
- **F6.4-RNF03** Continuar com as validações existentes de polígonos, posições, portas e janelas.
- **F6.4-RNF04** Evitar confundir visualização de planejamento com planta técnica certificada ou levantamento estrutural.
- **F6.4-RNF05** CI contra `develop`; não gerar APK nem alterar o banco de produção nesta fase.
- **F6.4-RNF06** Manter padrão visual azul do aplicativo e interface limpa.

## Critérios de aceite
- Criar cenário da sala real (4,5 × 3,2 m), alterar a largura do cenário para 6 m, conferir que `HomeData.rooms` continua com 4,5 m.
- Editar contorno em L do cenário pelo editor 2D, guardar revisão anterior e restaurá-la.
- Comparar vistas 2D e 3D "Antes · planta real" e "Depois · proposta", com fontes de dados separadas.
- Criar proposta do deck sem cômodo original, cadastrar espaço volumétrico no cenário, sem adicionar `Room` na casa.
- Duplicar proposta sem compartilhar estado interno.
- Exclusão de projeto com cenários -> bloquear; exclusão somente do cenário -> planta real permanece.
- Backup antigo V2 sem `scenarios` -> migração não destrutiva; backup novo -> round-trip sem perda.
- CI Vitest, build TypeScript e Playwright desktop/mobile; sem build Android.

## Fora de escopo
- Colocação de móveis e objetos de interiores (F6.5), modelagem de decks/áreas externas específica (F6.6), projetos estruturais, orçamentos automáticos e AR no editor de cenários.
