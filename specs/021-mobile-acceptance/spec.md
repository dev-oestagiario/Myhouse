# F7.6 — Auditoria final de navegação Android

- RF01: modais e menu mobile isolam o fundo, contêm Tab/Shift+Tab e restauram foco ao fechar. Teclado permite pular para o conteúdo. Menus de contexto respeitam viewport.
- RF02: verificar formulários com seções abertas, erro de módulo pesado sem perda da navegação, regressões de F7.0–F7.5, desktop e mobile em Chromium.
- RF03: APK debug verificável, com checksum e relatório de tamanho, preparado após gates automatizados verdes. Nenhuma release estável automática.
- RNF01: registro explícito dos casos não executados (TalkBack, zoom real, gestos, teclado, WebView, ARCore e desempenho físico); axe e compilação não substituem estes gates.
