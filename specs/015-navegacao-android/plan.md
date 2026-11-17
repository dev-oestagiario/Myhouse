# Plano técnico

1. Roteamento leve com hash e identificador de projeto, sem dependências. App mantém rota e caminho hierárquico. Workspace recebe seleção controlada; filtros preservados ao voltar da mesma seção.
2. FloatingActions reutilizável com disclosure acessível, fechamento externo/Escape e retorno de foco. Uma instância contextual em cada listagem/aba. Contratos das funções de criação preservados.
3. Modal responsivo de cadastro em tela cheia para celular/retrato e touch landscape compacto. Título e retorno fixos; foco e rolagem interna. Formulários de atualização de obra, anexos e área externa deixam a listagem.
4. Revisão de CSS e remoção da área de conta/sincronização de sucesso; erros mantidos.
5. Atualizar regressões E2E, incluir caso de histórico, breadcrumb, recarga, foco e ausência de formulário na lista. CI Vitest, TypeScript, Playwright, Postgres e Android. Validar botão físico de voltar em aparelho real posteriormente.
