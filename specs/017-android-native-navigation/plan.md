# Plano

1. Aderir à F7.1 após CI; PR encadeado sobre a branch anterior.
2. Implementar hierarquia de retorno determinística e registro de camadas por prioridade; ouvir backButton Android via @capacitor/app e eventos de teclado via @capacitor/keyboard (8.0.0). Alt+Left aciona o mesmo controlador no navegador.
3. Proteger rascunhos em modal e editor; escaneamento retorna por etapa; portal de modal evita recorte por ancestrais.
4. Usar VisualViewport e safe areas no layout, retirar barra/FAB quando teclado detectado; reduzir viewport no E2E para cobrir geometria.
5. Executar Vitest, TypeScript, build, E2E e Gradle. Validar em Android físico: gesto/botão Voltar, teclado real, mudança de orientação, permissão câmera e retorno de Activity ARCore. Não gerar release automaticamente.
