# F6.5 — Plan: interiores

## Arquitetura
- `src/types.ts`: tipos `FurnitureKind`, `FurnitureColor`, `ScenarioFurniture`; arrays de móveis em `ProjectScenario` e `ScenarioRevision`.
- `src/features/projects/furnitureGeometry.ts`: catálogo, bounding footprint rotacionado, teste poligonal e SAT para sobreposições, posicionamento automático e snap à parede, limites.
- `src/domain/scenarioValidation.ts`: valida todas as geometrias de móveis, cômodos e revisões, sem descartar dados inválidos.
- `src/domain/homeMigration.ts`: normalizar `furniture:[]` **somente se ausente** nos backups V2 antigos; rejeitar presentes malformados.
- `src/features/projects/scenarioDomain.ts`: comandos imutáveis para incluir/editar/excluir móveis, snapshots de geometria+móveis, clonagem profunda e reset/restauração integral.
- `src/plan/Furniture3D.tsx`: formas Three.js leves e sem downloads de terceiros, clique para seleção.
- `src/plan/HouseModel.tsx`: props opcionais de móveis e seleção para compatibilidade da planta real.
- `src/features/projects/InteriorWorkspace.tsx`: fluxo principal com seletor de cômodo, catálogo, vista 3D e SVG arrastável, inspector e operações explícitas.
- `src/features/projects/ScenarioWorkspace.tsx`: tab Interiores 3D, exibição de móveis na proposta e comparação antes/depois.
- `src/features/projects/interiors.css`: adaptação mobile e padrões azuis.

## Contratos de geometria
Coordenadas X/Z referem-se ao centro do móvel, medidas em metros locais do cômodo, Y definido pelo piso; rotação em graus no plano X/Z. Transformações do 3D devem corresponder exatamente à planta SVG. O teste de encaixe inclui cantos dentro do polígono, interseções entre arestas e teto, não apenas a caixa externa. Colisão SAT detecta interpenetração como **aviso**, exceto tapetes.

## Fluxos
- Inserir objeto: escolher item e cômodo > gerar ID > procurar encaixe > validar domínio > atualizar `HomeData.scenarios` e histórico > persistência existente.
- Selecionar objeto no 3D/lista > alterar rascunho local > salvar único snapshot. Arrastar no SVG atualiza rascunho e confirma uma única vez ao soltar.
- Alinhamento: selecionar aresta e deslocar pelo semiplano interno mais metade da profundidade, com margem; salvar manualmente.
- Duplicação do cenário copia móveis profundamente; reset da planta pede confirmação sobre os móveis e preserva revisão; restauração recupera layout+mobília.
- Arquivo legado omite `furniture`: migração para []; arquivo com tipo errado é rejeitado; V2 mantido sem novo SQL.

## QA e release
1. Vitest de área válida em L/U, colisão, dimensões, catálogo, snapping, cenários, histórico, isolamentos e migração.
2. Playwright: criar, inserir, selecionar, mover, redimensionar, girar, mudar acabamento, duplicar, comparar, arquivar, limite e viewport mobile.
3. CI build React/TS, E2E desktop/mobile e testes axe da navegação.
4. Revisar e fazer merge apenas na `develop`. Sem APK, sem migration de produção. Gate SQL `HomeData V2` da F6.0 continua pendente para release final.
