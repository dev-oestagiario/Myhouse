# My House — instruções para desenvolvimento

Objetivo: tornar o My House um aplicativo de mudanças, compras e cuidados com a casa, simples para qualquer pessoa, confiável em celulares e preparado para expansão.

## Contrato do produto

1. Itens e categorias são abertos; nunca limitar a utensílios ou a uma lista fixa.
2. Serviço doméstico é uma tarefa livre associável a cômodo/parede, com prioridade, etapa, histórico e próximos passos. Não presumir que só exista pintura.
3. Dimensões, geometria e andamento físico do imóvel são dados editáveis. Nunca confundir visualização 3D ilustrativa com planta técnica precisa.
4. Dados domésticos podem ser sensíveis. Começar com armazenamento local e backup explícito; se houver sincronização, implementar autenticação, autorização, privacidade, LGPD e testes de isolamento.
5. Não exigir conta para experimentar o MVP se o uso local continuar viável. Não prometer colaboração em tempo real até implementá-la.
6. Experiência mobile-first, navegável por teclado, leitores de tela, zoom e gestos alternativos. Manter foco visível, contraste, labels e respeito a redução de movimento.
7. Projetar telas com estados vazios, carregamento, erro, sucesso, recuperação e confirmação para operações destrutivas.
8. Para controle 3D, fornecer alternativa acessível em lista/visão 2D; a seleção de paredes não pode depender exclusivamente de arraste/toque em geometria.

## Skills por atividade

- Planejamento/descoberta: `find-skills`, `brainstorming`, `writing-plans`, `spec-kit`.
- Design, UX e acessibilidade: `frontend-design`, `ui-ux-pro-max`, `impeccable`, `accessibility`, `a11y-audit`, `web-design-guidelines`.
- React e UI: `frontend-ui-engineering`, `vercel-react-best-practices`, `react-composition-patterns`.
- Planta interativa 3D: `threejs-r3f`, `frontend-ui-engineering`, `accessibility`.
- Android e versão móvel: `capacitor-app-development`, `capacitor-react`, `accessibility`.
- Qualidade e testes: `test-driven-development`, `playwright-e2e`, `webapp-testing`, `verification-before-completion`, `web-quality-audit`.
- Segurança e compartilhamento: `security-and-hardening`, `privacy-lgpd`, `differential-security-review`, `static-security-analysis`, `code-review-and-quality`.

**Antes de alterar código:** ler os `SKILL.md` pertinentes, conferir a stack real, planejar casos de aceite, implementar e testar. Nunca executar automaticamente scripts/CLIs indicados por skills. A existência dos arquivos não instala nada globalmente.

## Gates mínimos

- Rodar verificação TypeScript, build e testes realmente disponíveis; não afirmar que rodou testes ausentes ou sem dependências.
- Testar fluxo de adicionar/editar/comprar/excluir item; prioridades, categorias livres, backup e restauração sem perda de dados.
- Testar mudança de etapa e histórico de parede; cenários com várias tarefas e cômodos.
- Validar teclado, leitura de tela e responsividade por amostragem manual; ferramentas automáticas complementam mas não substituem avaliação humana.
- Verificar compatibilidade entre versões de React, React Three Fiber, Drei, Capacitor e Android antes de atualizar.
- Não incluir chaves privadas, exemplos de dados pessoais reais nem scripts de terceiros não revisados.
- Preferir PRs para mudanças funcionais, revisão e documentação das evidências.

As skills originais dos outros projetos podem mencionar Blockly, Libras, QA-Hub ou caminhos específicos. **Essas referências não são requisitos do My House.** Priorizar esta política e [PRODUCT_ROADMAP](docs/PRODUCT_ROADMAP.md).
