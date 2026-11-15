# Plano de implementação — Escaneamento assistido

**Especificação:** [ROOM_SCAN_SPEC.md](ROOM_SCAN_SPEC.md)
**Repositório:** Myhouse / conexão GitHub DEV
**Evolução:** F1, F2 e F3 integradas. F4 em validação por CI nesta branch; testes em hardware e distribuição assinada ainda dependem de ações explícitas.

## F0 — Análise concluída

- [x] Conferir `Room` e o renderizador Three.js atuais.
- [x] Preservar `HomeData` v1 e RLS existentes: foto não vai ao banco.
- [x] Definir consentimento e limites da medição por câmera comum.
- [x] Planejar evolução ARCore sem fingir que o browser mede profundidade.

## F1 — Funcionalidade inicial

- [x] Criar regras puras e testes automatizados para as dimensões e limites.
- [x] Criar fluxo para capturar vistas de um cômodo, permitir pular fotos e selecionar imagens do aparelho.
- [x] Usar câmera via Capacitor no Android e entrada de arquivo/câmera na web.
- [x] Formulário de medidas, nome e posição da planta.
- [x] Prévia 3D, confirmação explícita e integração com `setHome` / Supabase existente.
- [x] Entradas em Planta 3D e Obras, estilos mobile-first, informações de acessibilidade.
- [x] Adicionar testes no CI e documentação para validar APK.
- [ ] Executar build/testes no CI e inspeção em Android real; registrar evidências.

## F2 — ARCore (posterior)

- [x] Escolher ARCore SDK Android 1.56.0 com recurso opcional e instalação do Google Play Services para RA sob demanda.
- [x] Criar bridge Capacitor `RoomAR` nativa Android opcional; verificar suporte via `checkAvailabilityAsync`.
- [x] Rastrear dois pares de pontos do piso via `Frame.hitTest`, com âncoras e indicação de uso de profundidade quando aplicável. Altura permanece manual; não detecta cantos automaticamente.
- [x] Solicitar confirmação e permitir corrigir qualquer medida antes de salvar; não guardar frames ou âncoras.
- [x] Testes automatizados de validação de resultado; fallback web/Android sem suporte ou permissão negada.
- [ ] Testes manuais em aparelhos reais com/sem ARCore, permissão negada, baixa textura e medições comparadas com trena.

## F3 — Planta detalhada (integrada)

- [x] Suportar geometrias irregulares além de prismas retangulares; presets L/U e vértices editáveis.
- [x] Editor separado 2D de vãos (portas/janelas) e alinhamento pela caixa envolvente entre cômodos.
- [ ] Visão computacional opcional com consentimento específico e testes de precisão — **não implementada**; depende de backend/modelos e avaliação de privacidade antes de disponibilizar.
- [x] Testes de geometria, compatibilidade de backup V1 e validações, ver [ADVANCED_FLOORPLAN_F3.md](ADVANCED_FLOORPLAN_F3.md).
- [x] Validar compilação React/Android no CI; não atribuir precisão técnica à planta ilustrativa.
- [ ] Testes da interface e da precisão no celular real.

## F4 — Qualidade e lançamento (em validação)

- [x] Adicionar testes Playwright/axe em CI, com Supabase fictício, fluxos de compras, obras, planta 2D, escaneamento e viewport móvel.
- [x] Implementar foco/teclado/Escape em modais e navegação acessível.
- [ ] Validar resultado dos testes automáticos e testes manuais de acessibilidade em dispositivos variados.
- [ ] Medidas reais comparativas de ARCore com trena e regressão com contas de teste Supabase em aparelhos reais (CI simula API).
- [x] Preparar workflow manual de assinatura Android persistente com Secrets, ver [F4_QA_RELEASE.md](F4_QA_RELEASE.md).
- [ ] Configurar keystore externo, executar APK assinado, comparar assinatura/versionCode e aprovar matriz de dispositivos antes de declarar distribuição pronta.

## Validação da F1

Comandos: `npm install`, `npm run test`, `npm run build`. Na main, `GitHub Actions` deve testar, compilar e publicar a Release. Validar fotos/cancelamentos no APK em Android real. **Não confundir teste da lógica com teste de câmera nativa ou ARCore.**
