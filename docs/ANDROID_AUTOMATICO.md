# APK Android automático — My House

## Baixar sem procurar em Actions

- **Link direto para o APK mais recente (quando a primeira Release for concluída):** https://github.com/dev-oestagiario/Myhouse/releases/latest/download/MyHouse.apk
- **Ver todas as versões:** https://github.com/dev-oestagiario/Myhouse/releases

O repositório é privado; faça login no GitHub com uma conta autorizada.

## Funcionamento

O arquivo `.github/workflows/android-apk.yml` roda automaticamente em cada push à branch `main` ou manualmente em **Actions → Gerar APK Android - My House → Run workflow**.

1. Configura Node.js 22, Java 21 e SDK Android.
2. Executa `npm install` e `npm run android:prepare` (Vite/React + Capacitor).
3. Compila `app-debug.apk` com Gradle.
4. Verifica que o APK existe e é um ZIP válido.
5. Envia o APK também como artefato de Actions, retido por 30 dias.
6. Cria uma **GitHub Release** com uma tag por build, nome `My House — APK Android (build N)`, anexa `MyHouse.apk` e `MyHouse.apk.sha256` e a marca como versão mais recente.

A publicação só acontece se a compilação e as verificações anteriores terminarem com sucesso. Um commit com falha não substitui o download da última Release bem-sucedida.

## Assinatura e atualização

O APK é **debug**, assinado para testes; não é uma publicação de produção nem um arquivo para a Play Store. O ambiente de build pode gerar uma assinatura de desenvolvimento diferente a cada execução. Nesse caso, o Android pode rejeitar a instalação sobre a versão anterior. **Confirme que aparece “Salvo na nuvem”, exporte seu backup e só depois considere desinstalar a versão antiga**, pois a desinstalação apaga rascunhos locais não sincronizados.

Para distribuir atualizações instaláveis sobre versões anteriores, é necessário configurar uma chave de assinatura persistente, guardada nos GitHub Secrets, e um pipeline de release assinado.

## Permissões

O workflow utiliza `GITHUB_TOKEN` com `contents: write` para criar tags e Releases. Não é preciso adicionar um token pessoal ao repositório; as chaves do Supabase usadas no cliente são públicas e nunca incluem `service_role`.

Se o passo de publicação retornar erro de permissão, revisar **Settings → Actions → General → Workflow permissions** e a política da organização.

Se um build falhar, consulte os logs do workflow. Apenas uma execução concluída com sucesso confirma que uma nova Release foi publicada.
