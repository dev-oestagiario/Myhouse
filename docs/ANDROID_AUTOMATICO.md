# Build Android automático - My House

O workflow `.github/workflows/android-apk.yml` é acionado em todo push na branch `main`, inclusive se apenas arquivos de documentação mudarem, ou manualmente em **Actions > Gerar APK Android - My House > Run workflow**.

A sequência é: Node 22 + Java 21 + SDK Android > `npm ci` > compilação Vite > `npx cap add android` > ícone adaptativo azul-escuro > `npx cap sync android` > `./gradlew assembleDebug`.

Ao terminar com sucesso, baixe o artefato **myhouse-android-debug-apk** na execução do GitHub Actions. O ZIP do artefato contém `app-debug.apk` (APK de teste, assinado com chave de desenvolvimento). Não é um APK de distribuição para a Play Store.

O aplicativo utiliza a URL HTTPS e uma **publishable key** pública do projeto Supabase Myhouse. Não usa credenciais secretas. A conta deverá confirmar seu email conforme as configurações do Supabase Auth.

Para migrar para distribuição oficial, configurar chave privada de assinatura via GitHub Secrets (nunca em Git), versão, Play App Signing e política de privacidade.

Se um build falhar, consulte os logs do workflow. Adicionar o YAML ao repositório não prova que o APK foi compilado; isso só é confirmado depois que uma execução do GitHub Actions finalizar com sucesso.
