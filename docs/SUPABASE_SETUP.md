# Supabase no My House — instalação por projeto

O My House separa os dados por **usuário autenticado**, mesmo quando várias pessoas usam o mesmo site. O banco deve ser específico do My House, e não reutilizado de sistemas externos.

## 1. Criar projeto

1. No [Supabase Dashboard](https://supabase.com/dashboard), crie um projeto **My House** na organização desejada.
2. No **SQL Editor** desse projeto, execute `database/schema.sql`. Ele cria apenas a tabela `public.user_homes`, suas regras RLS e permissões necessárias. É possível reexecutá-lo.
3. Confirme em **Database > Tables** que `public.user_homes` tem Row Level Security ativado e as quatro políticas de acesso.
4. Em **Authentication > Providers**, habilite **Email/Password** e confirme como será feita a verificação de e-mail. Por padrão, projetos hospedados exigem confirmação por e-mail.

## 2. Chaves públicas e redirecionamento

No projeto Supabase, use **Project URL** e **Publishable key**. Não use `service_role`, `sb_secret_` ou senha do banco em variáveis `VITE_`, commits, `index.html` ou APK.

```bash
cp .env.example .env.local
```

Edite `.env.local` com:

```
VITE_SUPABASE_URL=https://SEU-PROJECT-REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Em **Authentication > URL Configuration**, inclua a URL local (por exemplo `http://localhost:5173/`) e a URL final do site (por exemplo `https://dev-oestagiario.github.io/Myhouse/`) em **Redirect URLs**, além de definir a Site URL correta para produção.

Para **GitHub Actions / Pages**, cadastre as variáveis de repositório `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (Settings > Secrets and variables > Actions > Variables). Estas variáveis são públicas por natureza; nunca cadastre nelas chaves secretas. O workflow exige ambas antes do deploy.

## 3. Uso

- `npm install` e `npm run dev` executam a aplicação. A senha é gerenciada pelo Supabase Auth, não por tabelas próprias.
- Cada novo usuário vê uma casa vazia. O app carrega apenas `user_homes.user_id = auth.uid()`.
- Cadastros/alterações salvam automaticamente. Uma indicação de estado mostra se a nuvem recebeu os dados. Conflitos entre sessões não são sobrescritos silenciosamente: exporte um backup e recarregue para reconciliar.
- Sem rede, a versão atual **não garante sincronização**. Se o envio falhar, os dados ficam na tela e num rascunho local por conta. Na próxima entrada, escolha recuperar ou descartar. Exporte JSON antes de fechar se houver falha.
- Para trazer dados da versão antiga que usava `localStorage`, **exporte um JSON pela versão antiga** e use **Importar** dentro da conta nova. Não há importação silenciosa do armazenamento compartilhado do navegador.
- As contas são privadas. Compartilhar uma residência entre diferentes contas é um recurso futuro, ainda não implementado.

## 4. Verificação antes de disponibilizar ao público

Teste com **duas contas reais A e B**: A cria compras, cômodos e histórico; B não deve visualizar nem modificar dados de A; A deve recuperar os dados em outro navegador; uma tentativa de ler uma linha alheia pelo cliente deve retornar vazio/sem permissão.

Confira email de confirmação, redefinição de senha, sair/entrar, erro de rede, backup e atualização simultânea em duas abas. Rode a verificação de segurança do Supabase (Advisors) para o projeto real. A criação deste arquivo **não significa que o banco foi provisionado ou que esses testes ocorreram**.
