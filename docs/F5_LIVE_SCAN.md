# F5 — Escaneamento ao vivo, sem fotografias

Decisão de produto em 15/11/2026: manter **ARCore** onde suportado e uma **câmera contínua com reconstrução geométrica local sem IA externa** nos demais dispositivos. Todo cômodo gerado continua editável e exige conferência antes de salvar. Nenhuma captura de foto/vídeo é necessária.

## Etapa 1 — Câmera ao vivo e escolha automática (nesta branch)

- [x] Remover o caminho de tirar/selecionar fotos do assistente.
- [x] Detectar compatibilidade pela bridge nativa `RoomAR.availability()` (nunca pelo user-agent).
- [x] Abrir automaticamente a atividade Android ARCore já existente em aparelhos compatíveis: medição manual de dois pares de pontos no piso, com largura/comprimento estimados.
- [x] Sem ARCore: abrir streaming local da câmera via `getUserMedia` (permissão no momento de começar), sem salvar imagens.
- [x] Encerrar as tracks ao navegar, pausar, ocultar ou desmontar a tela; permitir retentar quando câmera for bloqueada.
- [x] Manter entrada manual, revisão 3D e confirmação explícita antes de persistir dados de cômodo.
- [x] Remover botão 'Sair' do assistente e apresentar ação secundária 'Voltar'.
- [x] Começar a usar identidade azul no assistente e preparar tratamento de estados mobile.
- [x] Testes unitários de seleção automática e E2E do fluxo sem fotos (código incluído).
- [ ] Validar resultados de CI React / E2E e teste manual de permissões de câmera no APK final.
- [ ] Validar WebView Android em aparelhos sem ARCore: disponibilidade de `navigator.mediaDevices.getUserMedia` e transição de background/foreground.

**Limite honesto da etapa 1:** a visualização de câmera **não reconstrói nem mede paredes automaticamente** no modo sem ARCore. No ARCore, a atividade nativa atual ainda exige selecionar pontos; o pipeline de mapeamento automático será progressivo.

## Etapa 2 — Reconstrução geométrica sem ARCore (pendente)

- Avaliar rastreamento visual, calibração por referência de escala e estimação de planos sem modelos de IA, com medições comparadas à trena.
- Processamento local, indicadores de qualidade de rastreamento e recuperação após perda de pontos; jamais tratar contorno inferido como medida técnica.
- Desenhar cômodo inicial apenas se o modelo tiver evidência suficiente; permitir conferir e corrigir toda dimensão.
- Definir matriz de aparelhos, consumo e desempenho mínimo antes de afirmar cobertura universal.

## Etapa 3 — Revisão e persistência (pendente)

- Converter contornos estimados em geometria compatível com `Room` / editor 2D/3D, mantendo dados antigos.
- Ajustar escala/dimensões com atualização da visualização e sem perder o traçado quando possível.
- Conferência explícita do cômodo antes de salvar; nenhuma imagem ou frame enviado ao Supabase.

## Política de builds para a F5

**Não compilar/publicar APK a cada etapa.** Manter o desenvolvimento na branch F5, executar testes web/TypeScript e E2E nos PRs; o job Android do PR passa a ser manual. Integrar à `main` e acionar a Release Android **somente quando as três etapas estiverem implementadas e revisadas**. A publicação automática de APK existente fica vinculada à `main`.

## UX e identidade visual

A padronização de toda a aplicação em azul, incluindo painel, navegação e editor 2D/3D, é uma melhoria separada da entrega técnica desta etapa. O novo assistente já adota o azul como base; não declarar o restante do aplicativo visualmente padronizado antes da revisão completa.

## Privacidade e acessibilidade

- Solicitar câmera apenas depois do comando do usuário. Sem gravação, fotos, arquivos ou envio de frames por rede.
- Oferecer opção manual a qualquer momento, inclusive em caso de recusa.
- Manter botões com texto, estados comunicados por leitor de tela, foco visível e alvos adequados em mobile.
- Sem zoom/gesto obrigatório para inserir medidas; prévia ilustrativa continua não técnica.
