# F6.5 — Specify: editor de interiores 3D e móveis planejados

**Status:** implementação destinada apenas à `develop`, sem APK, migração de produção ou alterações na `main`.

## Problema
A F6.4 permite planejar geometrias futuras, mas ainda não permite distribuir objetos para avaliar um novo layout, circulação e dimensões de móveis. O usuário deseja reorganizar a sala, instalar um escritório, testar alternativas para um quarto e planejar interiores sem comprar os itens imediatamente.

## Objetivo
Adicionar um **catálogo interno de móveis volumétricos**, que possam ser inseridos no cenário de projeto, movidos por planta 2D ou ajustados numericamente, rotacionados, dimensionados, alinhados a paredes e vistos no 3D. A planta real nunca é alterada.

## Jornadas
1. Em Projeto > Cenários 2D/3D, criar/abrir proposta com ao menos um cômodo > **Interiores 3D**.
2. Selecionar o cômodo, filtrar o catálogo e inserir Sofá, Poltrona, Mesa, Cadeira, Cama, Guarda-roupa, Escrivaninha, Estante, Tapete, Planta, Armário ou Luminária.
3. Tocar no objeto 3D ou na lista de objetos para editar seu nome, dimensões, posição local X/Z, rotação e acabamento.
4. Arrastar o objeto na planta 2D ou mover em passos de 10 cm no inspetor, girar 90°, alinhar a uma parede selecionada ou informar posição exata.
5. Salvar alterações e acompanhar no histórico até 12 versões anteriores da proposta. Restaurar versão resgata **planta e móveis**.
6. Duplicar ou excluir móveis com confirmação. Duplicar o cenário cria uma cópia independente de todos os móveis.
7. A comparação "Antes/Depois" mostra mobiliário apenas na proposta. A planta real não recebe móveis planejados.
8. Projeto arquivado é somente leitura e mantém catálogo, posições e histórico visíveis.

## Requisitos funcionais
- **RF6.5.01** `ScenarioFurniture` contém id, roomId, kind, name, x/z em metros relativos ao cômodo, rotação em graus, largura, profundidade, altura e cor.
- **RF6.5.02** Móveis pertencem a **um cenário**. Não existe `HomeData.furniture` global e nenhuma operação escreve em `HomeData.rooms`.
- **RF6.5.03** 12 modelos geométricos nativos sem assets externos; variam por categoria, dimensões e cor. São modelos **esquemáticos**, não catálogos de lojas.
- **RF6.5.04** Posicionamento inicial em local livre preferindo o centro; rejeita objetos sem espaço para caber.
- **RF6.5.05** Valida dimensões, altura do cômodo e encaixe do quadrilátero rotacionado no polígono, inclusive formas L/U e concavidades; não permite atravessar paredes.
- **RF6.5.06** Sobreposição entre móveis exibe **aviso**, não bloqueia, pois há sobreposições legítimas (ex.: decoração). Tapetes podem ficar sob outros móveis.
- **RF6.5.07** Movimento na planta 2D com pointer events; inspector também permite operação acessível em touchscreen e teclado.
- **RF6.5.08** Alinhamento usa a normal interna da parede e a largura/profundidade do móvel, recusando encaixes impossíveis.
- **RF6.5.09** Ação explícita "Salvar móvel" registra uma versão, evita gravação/undo por tecla digitada; arrasto concluído também salva como operação única.
- **RF6.5.10** Snapshots incluem `rooms` **e** `furniture` e a restauração recupera ambos. Duplicação profunda isola objetos entre cenários.
- **RF6.5.11** Não excluir cômodo contendo móveis antes de removê-los ou realocá-los. Mudanças da geometria da planta que tornem um móvel inválido são rejeitadas.
- **RF6.5.12** "Copiar planta atual" limpa móveis planejados da versão ativa, após confirmação, mas preserva disposição anterior no histórico.
- **RF6.5.13** Backups V1, V2 F6.4 e novos continuam importáveis, com `furniture:[]` nos documentos antigos; dados inválidos novos não são descartados.
- **RF6.5.14** Máximo de 120 móveis por cenário e 12 revisões por cenário para controlar o tamanho do JSON.

## Não funcionais
- Interface em português brasileiro, identidade visual azul e uso responsivo.
- Editor utilizável sem AR e sem IA; não depende de internet externa para carregar modelos (persistência continua seguindo mecanismo Supabase da aplicação).
- Seleção/edição acessível sem WebGL através de lista e formulário; 3D é representação suplementar.
- Validação ao importar e ao gravar; não há relação com compras nem preços até uma fase posterior.
- Sem novos pacotes nem serviços; PR `develop` e CI com Vitest, TypeScript e Playwright em desktop/mobile.

## Aceite
- Inserir sofá, alterar X/largura/ângulo/cor, salvar, comparar antes/depois, duplicar e restaurar versão; `HomeData.rooms` nunca muda.
- Tentar posição além da parede ou altura superior ao teto gera erro e não salva.
- Copiar cenário preserva móveis de forma independente.
- Remover cômodo com móveis é bloqueado; remover móvel permite remover o cômodo.
- Importar arquivo F6.4 sem propriedades móveis funciona e preserva geometria/revisões.
- Arquivar projeto impede alterações de móveis.
- Tests sem regressão F6.0–F6.4; nenhuma compilação APK.

## Fora de escopo
- Modelos fotorrealistas, catálogos de fabricantes ou importação GLB/GLTF.
- Simulação estrutural e validação profissional de segurança, iluminação física realista, passagem de portas ou ergonomia normativa.
- Relação comercial de modelos com produtos compráveis, controle de inventário 3D e modelagem de decks/áreas externas detalhadas (F6.6).
