# F6.6 — Specify: Espaços externos e deck em cenários

**Escopo:** F6.6; dependência: F6.4/F6.5 integradas em develop. Implementação em PR para develop. Sem alteração de schema SQL.

## Histórias e aceite
- RF09, RF11 — Como pessoa planejando um quintal, posso criar uma área externa **sem cadastrar cômodo interno** e editar seu polígono por vértices (metros) e cota de piso, com área calculada em m².
- RF10 — Posso ver uma plataforma paramétrica em 2D e 3D, escolher acabamento ilustrativo e marcar arestas com guarda-corpo e degraus esquemáticos.
- RF03, RF04, RF12 — Cada área fica **somente no cenário**; clonar cenário, restaurar versão e exportar/importar backup conservam dados e não alteram a planta real.
- RF05–RF08 — As tarefas e compras já existentes continuam vinculadas ao projeto, inclusive quando não há cômodo; links diretos para navegar ao gerenciamento do projeto.
- RNF02/RNF03 — Edição via formulário/2D, sem obrigar a usar Canvas/WebGL; layout responsivo e foco/labels.
- RNF04/RNF05 — Backup F6.5 sem áreas externas válido; geometrias cruzadas, degenera das, dimensões não finitas e arestas inválidas são rejeitadas.

## Limites explícitos
O deck é **simulação visual**. Contorno, espessura, nível, guarda-corpo e degraus não implicam especificação de montagem, resistência, código de obras, segurança ou quantitativo de material. A área em m² é uma estimativa geométrica informada pelo usuário. Não gerar listas automáticas de estrutura.

## Gatilhos de aceite
- Criar projeto “Deck no quintal” sem ambiente interno -> criar cenário vazio -> criar deck -> editar polígono e nível -> visualizar 2D/3D -> reabrir e restaurar.
- Criar duas alternativas com acabamentos distintos sem trocar seus dados; tarefas e compras continuam no projeto.
- Recusar backup com pontos cruzados, números inválidos, referências de arestas quebradas; importação de backups antigos continua válida.
