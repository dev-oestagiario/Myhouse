# F7.2 — Comportamento nativo Android

RF01: Voltar fecha teclado, modal, menu ou FAB antes de alterar rota. Em etapas de escaneamento percorre as etapas em ordem inversa. No editor 2D pede confirmação antes de descartar alterações; formulários alterados pedem confirmação ao fechar pelo Voltar ou cabeçalho. No início minimiza o app, mantendo sessão. Rota direta retorna ao nível pai.
RF02: Ajustar viewport à área visível, ocultar navegação inferior/FAB enquanto teclado está aberto, permitir alcançar o último campo e botão salvar.
RNF01: Usar plugins oficiais Capacitor 8; inscrições limpas em desmontagem; manter navegação web e Escape. Nenhuma alteração no banco ou permissões. Não simular teste físico como aprovação; Alt+Left exercita o controlador compartilhado no Chromium, não o evento nativo.
