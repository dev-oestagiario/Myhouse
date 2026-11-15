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

Todo push em `main` inicia o workflow [Gerar APK Android - My House](.github/workflows/android-apk.yml) via GitHub Actions. Após um build bem-sucedido, o APK de teste pode ser baixado como artefato `myhouse-android-debug-apk`.

Leia [docs/ANDROID_AUTOMATICO.md](docs/ANDROID_AUTOMATICO.md). O APK só deve ser tratado como disponível quando houver uma execução bem-sucedida, confirmada na aba Actions.

## GitHub Pages

O workflow `.github/workflows/deploy.yml` publica o site a partir da `main`, se a funcionalidade GitHub Pages estiver ativada nas configurações do repositório.

## Segurança e validação

O projeto utiliza somente a chave publicável (não uma `service_role`), com RLS. O Security Advisor do Supabase não indicou avisos após a criação da tabela.

Ainda é necessário realizar testes de ponta a ponta com duas contas e validar a compilação Android no GitHub Actions. Contas diferentes não compartilham uma mesma residência nesta versão.

Veja [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).
