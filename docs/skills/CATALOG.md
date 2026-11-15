# My House — Catálogo de skills (62 arquivos)

**Status:** habilidades documentais copiadas para `.agents/skills/<nome>/SKILL.md`. As skills não instalam bibliotecas nem executam testes automaticamente.

| Fonte | Quantidade | Repositório |
| --- | ---: | --- |
| BlockDOM | 19 | https://github.com/kaina-visualsoftware/BlockDOM |
| LibrasEdu | 39 | https://github.com/dev-oestagiario/LibrasEdu |
| QA-Hub | 1 | https://github.com/kaina-visualsoftware/QA-Hub |
| Capawesome | 2 | https://github.com/capawesome-team/skills |
| Three.js Skills | 1 | https://github.com/cesartevisual/threejs-skills |

## Do Block Doom (19)
accessibility, agent-browser, blockly-visual-engineering, code-review-and-quality, design-taste-frontend, find-skills, frontend-design, frontend-skill-discovery, frontend-ui-engineering, grilling, impeccable, playwright-e2e, security-and-hardening, test-driven-development, ui-animation, ui-ux-pro-max, vercel-react-best-practices, web-design-guidelines, web-quality-audit.

## Do LibrasEdu (39)
brainstorming, writing-plans, executing-plans, systematic-debugging, verification-before-completion, async-python-patterns, python-testing-patterns, python-packaging, python-project-structure, fastapi-templates, api-design-principles, architecture-patterns, context-driven-development, workflow-patterns, python-error-handling, python-type-safety, track-management, a11y-audit, blender-animation, blender-character-rigging, blender-facial-shapekeys, blender-export-pipelines, blender-core, unity-animation, unity-csharp-scripting, webapp-testing, skill-creator, libras-pedagogy, libras-translation-evaluation, speech-recognition-vad, libras-avatar-3d, deaf-first-accessibility, document-ocr-pipeline, desktop-pyside6, privacy-lgpd, react-composition-patterns, differential-security-review, static-security-analysis, spec-kit.

Destas, 27 são originalmente skills externas já curadas no LibrasEdu, 11 foram escritas para LibrasEdu e 1 é adaptação de Spec Kit. O catálogo original está em https://github.com/dev-oestagiario/LibrasEdu/blob/main/docs/skills/CATALOG.md.

## Do QA-Hub (1)
agent-desktop — orientação específica de inspeção e teste visual. Os conhecimentos de frontend, React, segurança e testes do QA Hub já estão incluídos via Block Doom, evitando duplicatas.

## Novas skills identificadas (3)
- capacitor-app-development — https://github.com/capawesome-team/skills/tree/main/skills/capacitor-app-development
- capacitor-react — https://github.com/capawesome-team/skills/tree/main/skills/capacitor-react
- threejs-r3f — https://github.com/cesartevisual/threejs-skills/tree/main/skills/threejs-r3f

As três novas skills indicam licença MIT no repositório de origem; cópias dos textos MIT foram preservadas em `.agents/skills/third-party/`. A skill find-skills conserva sua licença original e a adaptação spec-kit mantém o aviso MIT.

## Aplicação no My House
| Trabalho | Skills prioritárias |
| --- | --- |
| Design responsivo | frontend-design, ui-ux-pro-max, impeccable, web-design-guidelines |
| React e componentes | frontend-ui-engineering, react-composition-patterns, vercel-react-best-practices |
| WCAG, teclado e leitores de tela | accessibility, a11y-audit, deaf-first-accessibility |
| Three.js e planta 3D | threejs-r3f, frontend-ui-engineering, accessibility |
| Android | capacitor-app-development, capacitor-react, verification-before-completion |
| Testes | test-driven-development, playwright-e2e, webapp-testing, web-quality-audit |
| Segurança de dados e compartilhamento | security-and-hardening, privacy-lgpd, differential-security-review |
| Revisão e entrega | code-review-and-quality, systematic-debugging, verification-before-completion |

**Não ativar indiscriminadamente todas as skills.** Exemplos relativos a Blockly, Libras, Unity, Blender, FastAPI ou QA-Hub não passam a ser requisitos do My House.

## Limites e origem
- Foram copiadas as instruções `SKILL.md`, sem scripts executáveis, CLIs, pesos, modelos ou datasets.
- Algumas skills apontam para referências auxiliares não incluídas; consultar os repositórios originais quando necessário.
- Consultar licenças e notices nas fontes originais antes de redistribuir material adicional.
- Nada foi instalado globalmente e nenhum teste de produto é considerado aprovado apenas porque os arquivos existem.
