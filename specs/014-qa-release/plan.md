# F6.8 — Plano técnico

1. Auditar deploy atual, rotinas Android, migrações e riscos de regressão.
2. Executar build/teste web, Playwright desktop/mobile, PostgreSQL efêmero para V1/V2 e compile-only Android pelo CI.
3. Dividir o bundle 3D com React.lazy e Suspense para preservar o acesso a tarefas sem carga inicial WebGL.
4. Converter Pages e APK debug em execução manual e impedir release assinado sem declaração de aceite com evidências e prazo de validade.
5. Em ambiente de produção, fazer backup verificável, aplicar V2 sem converter documentos existentes e validar escrita autenticada com conflito de revisão.
6. Ativar bucket privado e RLS somente depois da migração, e demonstrar isolamento com duas contas reais.
7. Completar matriz de dispositivos Android e acessibilidade, aprovar release único e então liberar main.

Sem engenharia estrutural, dados pessoais em fixtures ou declarações fictícias de testes físicos.
