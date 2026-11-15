# Plano de implementação — Escaneamento assistido

**Especificação:** [ROOM_SCAN_SPEC.md](ROOM_SCAN_SPEC.md)
**Repositório:** Myhouse / conexão GitHub DEV
**Evolução:** incremental; F1 é o único escopo implementado nesta branch.

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

- [ ] Investigar bibliotecas SDK e versão mínima (ARCore Google Play Services for AR).
- [ ] Criar bridge Capacitor nativa Android opcional; verificar suporte e disponibilidade reais.
- [ ] Rastrear planos, cantos e pontos com qualidade e incerteza explícitas.
- [ ] Solicitar confirmação e permitir corrigir qualquer medida antes de salvar.
- [ ] Testes com e sem ARCore, sem permissão e com sensores indisponíveis.

## F3 — Planta detalhada (posterior)

- [ ] Suportar geometrias irregulares além de prismas retangulares.
- [ ] Editor de vãos e alinhamento entre cômodos.
- [ ] Visão computacional opcional, consentimento/privacidade e testes de precisão.

## F4 — Qualidade e lançamento (posterior)

- [ ] Playwright/axe, acessibilidade manual e dispositivos variados.
- [ ] Medidas reais comparativas, regressão de cadastro e sincronização.
- [ ] Assinatura Android persistente e release de produção.

## Validação da F1

Comandos: `npm install`, `npm run test`, `npm run build`. Na main, `GitHub Actions` deve testar, compilar e publicar a Release. Validar fotos/cancelamentos no APK em Android real. **Não confundir teste da lógica com teste de câmera nativa ou ARCore.**
