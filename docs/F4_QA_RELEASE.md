# My House — F4: qualidade, acessibilidade e lançamento

## Escopo desta entrega

- Playwright/Chromium automatizado, com **Supabase simulado localmente** (credenciais de teste fictícias). O CI não acessa os dados reais dos usuários para executar E2E.
- Testes de compra com categoria livre, cadastro de cômodo, atualização e histórico, geometria de planta 2D e portas/janelas, captura sem câmera e confirmação obrigatória.
- Verificações de navegação em viewport móvel, foco do teclado, Escape em modais, e auditoria axe nas páginas principais (bloqueio de violações graves/críticas de WCAG 2 A/AA e 2.1 AA).
- Workflow Android existente segue publicando APK **debug** automaticamente em Releases, com as ressalvas de assinatura atual.
- Workflow **manual e opcional** de APK assinado com keystore persistente armazenado exclusivamente no GitHub Actions Secrets. **Sem chaves fornecidas, não há APK assinado publicado e não se deve anunciar distribuição de produção.**

## Rodar verificações

```bash
npm install
npm run test
npm run build
npx playwright install chromium
npm run e2e
```

O workflow `.github/workflows/scan-quality.yml` roda os três jobs `react`, `android` e `e2e` em PRs.
Em caso de falha Playwright, anexa trace, screenshots e relatório HTML. 
No navegador de teste, use apenas o Supabase fictício (127.0.0.1); **não reutilizar contas reais**.

## Acessibilidade

Os modais de cadastro agora capturam o foco, tratam Tab/Shift+Tab/Escape, restauram o foco ao fechar e impedem rolagem do fundo. A página ativa informa `aria-current=page`, o menu mobile informa `aria-expanded` e permite Escape, e a navegação transfere foco à região principal.

Axe é apenas uma verificação automática. Ainda é necessário testar TalkBack, VoiceOver quando aplicável, teclado físico, zoom 200–400%, cores, alvos táteis e orientação em dispositivos reais.

## Matriz de verificação presencial (pendente)

| Ambiente | Cenário | Critério de aceite |
| --- | --- | --- |
| Android com ARCore e Depth API | Medir largura/comprimento em piso bem iluminado | Registrar distância de referência por trena e erro absoluto/percentual; o app permite revisão |
| Android com ARCore sem Depth | Detectar plano e selecionar quatro pontos | Retorna aproximação ou mensagem compreensível; sem falsa precisão |
| Android sem ARCore | Abrir Escanear cômodo | Fallback sem câmera e entrada manual disponíveis |
| Android com permissão negada | Negar câmera/AR | Cadastro manual continua disponível; sem travamento |
| Android com câmera indisponível | Cancelar, retomar, alternar de apps | Rascunho não salvo nem enviado sem confirmação explícita |
| Android com tela compacta e tablet | Obras, compras, planta e modais | Sem conteúdo cortado, sem rolagem horizontal, campos com foco visível |
| Android com TalkBack | Menu, botões, formulário e dialog | Leitura significativa e navegação sem arrastar no 3D |
| Conta Supabase de teste | Salvar cômodo, nova compra, editar planta, importar backup | Revisão incrementada, sem perda de dados e isolamento por usuário |
| Backup legado V1 | Importar cômodos retangulares | Cômodos, compras, registros e obras preservados |
| Atualização APK | Instalar duas versões **com a mesma chave** | Android aceita instalação por cima da anterior, `versionCode` cresce e dados permanecem |

**Não inventar números de precisão nem marcar estas verificações como realizadas** até alguém testar fisicamente e anexar evidência.

## Habilitar assinatura Android persistente

Os segredos nunca devem ser enviados no chat, em arquivo versionado ou por pull request. O responsável pela distribuição deve gerar e guardar uma chave Android fora do repositório, com backup seguro, e cadastrar estes quatro **Actions secrets** em **Settings → Secrets and variables → Actions**:

- `ANDROID_KEYSTORE_BASE64`: keystore de release codificado em base64, sem quebras de linha.
- `ANDROID_KEYSTORE_PASSWORD`: senha do keystore.
- `ANDROID_KEY_ALIAS`: alias da chave.
- `ANDROID_KEY_PASSWORD`: senha da chave.

Depois, executar **Actions → Publicar APK Android assinado (manual) → Run workflow**. O job prepara o projeto, injeta a configuração no Gradle gerado, define `versionCode` crescente, executa `assembleRelease`, verifica a assinatura com `apksigner` e publica `MyHouse-assinado.apk` em uma Release específica.

- Não há chaves incluídas nem release de produção ativada automaticamente.
- A assinatura debug dos APKs anteriores não é a mesma da versão assinada; é possível ser necessário backup/sincronização e instalação limpa para fazer a troca.
- Mantenha o **mesmo** keystore em todas as versões distribuídas sob essa assinatura. Se perder a chave, as atualizações diretas podem deixar de funcionar.
- O workflow manual `android-signed-release.yml` é independente do workflow debug e não substitui automaticamente os testes físicos.
- Releases assinadas e debug convivem: para atualizações assinadas, escolha as Releases `myhouse-signed-v1.*`. Publicações debug posteriores podem alterar qual aparece como `latest`.

## Status do projeto

`F4` só pode ser considerada concluída para **lançamento público** após assinatura persistente configurada, APK assinado verificado e a matriz de testes em aparelhos reais aprovada. Até lá, a entrega é de automação/infraestrutura de qualidade e uma trilha pronta para assinatura.


> Atualização F6.8: o gatilho automático de APK ao enviar para `main` será removido. O APK debug é gerado apenas manualmente e como artifact, sem GitHub Release. A publicação segue os gates de `docs/F6_8_RELEASE_GATE.md`.
