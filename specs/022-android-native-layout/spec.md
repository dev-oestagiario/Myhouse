# F7.7 — Correção do menu desktop no Android

Relato em APK F7: menu lateral web aparece no mobile. Causa identificada no código: seleção do modo dependia exclusivamente de media queries; WebView nativa larga ou combinação diferente de pointer/height podia cair no layout desktop. Não há acesso ao aparelho para confirmar a condição exata.

RF01: Android/iOS nativos usam modo mobile em qualquer viewport; web mantém responsividade. RF02: menu lateral fechado é removido do layout por hidden e só aparece após Mais/Abrir menu; navegação inferior presente e FAB acima, exceto teclado/modal. RF03: formulários em tela cheia no modo mobile, inclusive WebView larga; mudança de orientação preserva modo nativo. RF04: foco, Escape, Voltar, inert e retorno preservados. RNF: testes unitários, E2E em plataforma Android simulada larga e web desktop/compacta; CI completo e APK debug verificado. Teste físico continua pendente.
