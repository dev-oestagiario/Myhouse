# My House

Aplicativo React + TypeScript + Three.js para organizar compras, cômodos, prioridades e etapas de reforma, utilizando Supabase para autenticação e armazenamento individual por usuário.

## Supabase conectado

- Projeto **Myhouse** (região `sa-east-1`, referência `peijhetajeuiqomvfseg`).
- Tabela `public.user_homes` criada, RLS ativado e quatro políticas de controle de acesso aplicadas.
- Login por e-mail e senha; cada conta acessa seu próprio planejamento doméstico.
- No app, o conteúdo é salvo na nuvem, com backup JSON, tentativa de recuperação de rascunhos e aviso de conflitos.

## Execução local

```bash
npm install
cp .env.example .env.local
# configure a URL e a publishable key do projeto Myhouse no arquivo .env.local
npm run dev
```

## Android / APK

**[Baixar APK Android mais recente](https://github.com/dev-oestagiario/Myhouse/releases/latest/download/MyHouse.apk)** · **[Ver todas as versões](https://github.com/dev-oestagiario/Myhouse/releases)**

Todo push em `main` inicia o workflow [Gerar APK Android - My House](.github/workflows/android-apk.yml). Quando o build é concluído com sucesso, ele **publica automaticamente uma Release** com `MyHouse.apk` e o checksum SHA-256. O arquivo também continua disponível como artefato em Actions por 30 dias. As Releases só aparecem após a primeira execução bem-sucedida da nova configuração.

O APK é de desenvolvimento (debug), não é uma versão Play Store. Entre compilações, a assinatura pode mudar e impedir atualização direta; confirme a sincronização na nuvem e faça backup antes de reinstalar.

Leia [docs/ANDROID_AUTOMATICO.md](docs/ANDROID_AUTOMATICO.md). O APK só deve ser tratado como disponível quando houver uma execução bem-sucedida, confirmada na aba Actions.

## GitHub Pages

O workflow `.github/workflows/deploy.yml` publica o site a partir da `main`, se a funcionalidade GitHub Pages estiver ativada nas configurações do repositório.

## Segurança e validação

O projeto utiliza somente a chave publicável (não uma `service_role`), com RLS. O Security Advisor do Supabase não indicou avisos após a criação da tabela.

Ainda é necessário realizar testes de ponta a ponta com duas contas e validar a compilação Android no GitHub Actions. Contas diferentes não compartilham uma mesma residência nesta versão.

Veja [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

## Escaneamento de cômodos

Em **Planta 3D → Escanear cômodo**, pode-se fotografar o ambiente, preencher medidas manualmente e confirmar uma prévia 3D. Na versão Android, aparelhos com suporte a ARCore poderão medir distâncias aproximadas no piso usando quatro pontos selecionados pela pessoa. A altura continua manual e a revisão dos valores é obrigatória.

O ARCore é **opcional** e não funciona em todos os celulares. A implementação não converte automaticamente vídeo em geometria, nem tem precisão arquitetônica garantida. Leia [Plano de escaneamento](docs/ROOM_SCAN_PLAN.md).

## Planta detalhada — F3

Em **Planta 3D → Editar planta 2D**, é possível escolher formatos retangular, L ou U, ajustar os vértices em metros, inserir portas e janelas, posicionar cômodos e alinhar um cômodo à referência de outro. A **Planta 3D permanece destinada à visualização**. O banco Supabase e os backups V1 continuam compatíveis com modelos anteriores.

[Documentação de formatos irregulares e vãos](docs/ADVANCED_FLOORPLAN_F3.md). O editor não realiza reconhecimento automático de arquitetura por imagem nem substitui uma planta técnica.

## F4 — Qualidade e versões Android

O projeto agora conta com testes de interface em Chromium usando Playwright e verificação automatizada de acessibilidade por axe. Os testes usam um Supabase local simulado e **nunca** autenticação de uma conta real. Os relatórios de falha são anexados aos PRs no GitHub Actions.

O APK de teste continua disponível nas [Releases](https://github.com/dev-oestagiario/Myhouse/releases). Para produzir um APK com **assinatura persistente**, há um workflow manual separado, desativado na prática até o responsável cadastrar quatro Secrets de assinatura. Consulte [F4: QA e assinatura Android](docs/F4_QA_RELEASE.md). Não envie keystore, senhas ou segredos por chat.
