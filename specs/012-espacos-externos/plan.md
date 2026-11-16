# F6.6 — Plan: área externa e deck

## Dados
Acrescentar \`ScenarioOutdoorArea[]\` opcional no \`ProjectScenario\` e no \`ScenarioRevision\`. Os campos \`outline\` (PlanPoint em metros), \`x\`, \`z\`, \`level\`, \`thickness\`, \`finish\`, \`railingEdges\` e \`stepsEdge\` são exclusivos da cópia do cenário. Validar ambos os estados (atual e snapshots) no \`validateHome\`. Manter \`HomeData.version=2\` e \`user_homes\` JSONB; nenhuma migration adicional nesta fase.

## Interface e rendering
Aba “Áreas externas” em cenários, habilitada até em cenário sem cômodo. Editor por lista, formulário com vértices em metros, presets retângulo/L; vistas SVG 2D e R3F 3D (plataforma, acessórios ilustrativos). Consulta e edição não devem depender da manipulação direta de elementos 3D.

## Integridade
Todas as mutações passam por domínio de cenários, verificação de projeto não arquivado e histórico com até 12 versões. Duplicação isolada. O comando “Copiar planta atual” atua sobre cômodos/móveis e conserva áreas externas por serem independentes.

## Testes / implantação
Vitest: geometria, versão, isolamento, migração V2 antiga, restauração e arquivo inválido. E2E: projeto + cenário vazio + aba externa, campos editáveis e salvamento. \`npm run check\`, \`npm test\`, \`npm run build\` + Playwright CI; sem merge na main ou geração de APK até F6.8 e gate SQL V2 de produção.
