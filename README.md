# My House

Aplicativo React / TypeScript / Three.js para organizar compras, prioridades, cômodos, paredes e etapas da reforma. Cada pessoa acessa somente os dados da própria conta Supabase, protegidos por **Row Level Security (RLS)**.

## Setup

1. Crie um projeto Supabase específico para o My House e execute [database/schema.sql](database/schema.sql) no SQL Editor.
2. Configure a URL e chave publicável no `.env.local` com base em `.env.example`.
3. Execute `npm install` e `npm run dev`.
4. Configure Redirect URLs de autenticação, e as variáveis públicas do GitHub Actions antes de publicar.

Consulte [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) para instruções e testes de isolamento de contas.

## Recursos

- Cadastro e login por e-mail/senha, verificação de e-mail conforme configuração do Supabase e recuperação de senha.
- Cômodos com medidas e planta 3D interativa.
- Lista de compras com categorias livres e prioridades.
- Histórico de raspagem, reparo, lixamento, preparação e pintura por parede.
- Salvamento remoto com detecção de conflitos, rascunho de recuperação e backup JSON.
- Interface responsiva para computador e celular.

**Estado:** integração de código preparada, sem projeto Supabase do My House conectado nem deploy real validado. É necessário testar o login e RLS em duas contas reais antes de publicar. A versão APK/Capacitor deverá ser integrada e validada em etapa posterior; não há instalador gerado neste repositório.