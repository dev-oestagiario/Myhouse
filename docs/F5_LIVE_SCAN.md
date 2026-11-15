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

## Etapa 2 — Reconstrução geométrica sem ARCore (código implementado, validação pendente)

O fluxo sem ARCore agora cria um contorno **2D do piso** a partir da câmera contínua e de pontos indicados pelo usuário. O processamento é local, sem serviços de IA, fotos ou gravações.

### Funcionamento

1. A pessoa mantém o telefone **parado**, enquadrando a referência e todo o piso que deseja desenhar.
2. Informa a largura e comprimento reais de uma **peça retangular no mesmo piso** (ex.: um piso cerâmico medido com trena). Não presumir tamanho padrão de piso.
3. Marca os quatro cantos da referência, em ordem, na imagem ao vivo; o aplicativo valida convexidade, escala e degeneração.
4. Marca entre 3 e 24 vértices do encontro do piso com as paredes, também em ordem.
5. A homografia plana (sistema linear 8x8, pivoteamento parcial) converte as posições de tela em coordenadas métricas locais do mesmo plano.
6. A geometria é validada contra limites físicos, segmentos mínimos e auto-interseções. O aplicativo calcula largura, comprimento, área e perímetro **aproximados**.
7. Um detector leve de diferenças entre quadros (32×24 pixels, amostragem local e sem persistência) bloqueia o avanço e pede nova marcação quando há indicação forte de mudança no enquadramento. Esse detector **não faz SLAM nem garante rastreamento**.
8. A pessoa confere largura, comprimento e altura, visualiza a planta no 3D e confirma antes de salvar. O contorno é transmitido como `Room.footprint` e preservado no cadastro, compatível com o editor 2D existente.

### Critérios e limitações

- [x] Escala obrigatória obtida de um retângulo medido, com ambos os lados entre 0,10 e 10 m.
- [x] Homografia para corrigir perspectiva de pontos **coplanares**, sem inferir profundidade de uma única imagem.
- [x] Marcadores ao vivo com desfazer, limpar, mensagens de validação e entrada por teclado.
- [x] Geometria de 3 a 24 pontos; verificação de perímetro fechado simples, dimensão 0,10 a 100 m e consistência com o modelo do editor.
- [x] Reconstrução 2D integrada às medidas e prévia 3D; formas irregulares preservadas.
- [x] Detecção básica de mudança de cena, com reinício explícito da calibração.
- [x] Testes unitários para escala, projeção perspectivada, orientação e geometrias inválidas (código preparado).
- [ ] Executar CI e registrar testes de câmera reais sem ARCore, em telas de diferentes tamanhos.
- [ ] Comparar medidas geradas com trena em ambientes de teste (ex.: 2×3 m, 3×4 m, planta em L) e documentar erro absoluto e relativo.
- [ ] Auditar consumo, estabilidade do vídeo e permissões em WebViews Android.

**Não é detecção automática de paredes/cantos.** Não há reconstrução 3D completa, navegação de câmera livre com SLAM ou medida exata de altura. A projeção é válida apenas para pontos do mesmo piso com o telefone imóvel durante a marcação. Objetos, áreas fora do plano, mudanças na posição da câmera e referência incorreta distorcem o resultado; nunca declarar medidas arquitetônicas precisas.


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
