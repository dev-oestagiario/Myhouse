import { useEffect, useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { Home, LockKeyhole, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from './supabase';
import { initialHome, validateHome } from './data';
import type { HomeData } from './types';
import App from './App';

type HomeSnapshot = { data: HomeData; revision: number | null };
type AuthMode = 'signin' | 'signup' | 'reset' | 'new-password';

function LoginScreen({ recoveryMode, onRecoveryComplete }: { recoveryMode: boolean; onRecoveryComplete: () => void }) {
  const [mode, setMode] = useState<AuthMode>(recoveryMode ? 'new-password' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { if (recoveryMode) setMode('new-password'); }, [recoveryMode]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'reset') {
        const { error: issue } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}${window.location.pathname}`,
        });
        if (issue) throw issue;
        setMessage('Se o endereço estiver cadastrado, você receberá um link para redefinir sua senha.');
      } else if (mode === 'signup') {
        const { data, error: issue } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
        });
        if (issue) throw issue;
        if (!data.session) setMessage('Cadastro solicitado. Verifique seu e-mail para confirmar sua conta e depois entre no aplicativo.');
      } else if (mode === 'new-password') {
        const { error: issue } = await supabase.auth.updateUser({ password });
        if (issue) throw issue;
        setMessage('Senha atualizada. Você já pode acessar sua casa.');
        onRecoveryComplete();
      } else {
        const { error: issue } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (issue) throw issue;
      }
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Não foi possível concluir. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-layout">
    <section className="auth-card">
      <span className="auth-logo"><Home size={27} strokeWidth={2.2} /></span>
      <span className="auth-kicker">MY HOUSE</span>
      <h1>{mode === 'signin' ? 'Sua casa em ordem.' : mode === 'signup' ? 'Comece a organizar sua casa.' : mode === 'reset' ? 'Recupere seu acesso.' : 'Defina uma nova senha.'}</h1>
      <p className="auth-intro">{mode === 'signin' ? 'Entre para acessar suas compras, seus cômodos e seus projetos de melhoria em qualquer dispositivo.' : mode === 'signup' ? 'Cada conta tem seus próprios dados. Eles não aparecem para outras pessoas.' : mode === 'reset' ? 'Enviaremos um link de recuperação para o seu e-mail.' : 'Digite sua nova senha para continuar.'}</p>
      <form className="auth-form" onSubmit={e => void submit(e)}>
        {mode !== 'new-password' && <label>E-mail<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" /></label>}
        {mode !== 'reset' && <label>{mode === 'new-password' ? 'Nova senha' : 'Senha'}<input type="password" required minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="No mínimo 6 caracteres" /></label>}
        {error && <p className="auth-alert" role="alert">{error}</p>}
        {message && <p className="auth-success" role="status">{message}</p>}
        <button type="submit" className="btn btn-primary full" disabled={busy}>
          {mode === 'reset' ? <Mail size={17} /> : mode === 'signin' ? <LogIn size={17} /> : <LockKeyhole size={17} />}
          {busy ? 'Aguarde…' : mode === 'signin' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : mode === 'reset' ? 'Enviar link' : 'Salvar nova senha'}
        </button>
      </form>
      {mode !== 'new-password' && <div className="auth-navigation">
        {mode === 'signin' ? <><button type="button" onClick={() => { setMode('signup'); setError(''); setMessage(''); }}>Criar minha conta</button><button type="button" onClick={() => { setMode('reset'); setError(''); setMessage(''); }}>Esqueci minha senha</button></>
          : <button type="button" onClick={() => { setMode('signin'); setError(''); setMessage(''); }}>Voltar para entrar</button>}
      </div>}
      <p className="auth-privacy"><ShieldCheck size={16} /> Seus dados são protegidos por regras de acesso no banco de dados.</p>
    </section>
  </main>;
}

function UserHome({ user }: { user: User }) {
  const [snapshot, setSnapshot] = useState<HomeSnapshot | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    (async () => {
      setSnapshot(null); setError('');
      const { data, error: issue } = await supabase.from('user_homes')
        .select('data,revision').eq('user_id', user.id).maybeSingle();
      if (!active) return;
      if (issue) { setError(`Não foi possível carregar seus dados: ${issue.message}`); return; }
      try {
        setSnapshot(data ? { data: validateHome(data.data), revision: data.revision as number } : { data: structuredClone(initialHome), revision: null });
      } catch {
        setError('Os dados da sua conta estão em um formato inesperado. Não foi feita nenhuma alteração.');
      }
    })();
    return () => { active = false; };
  }, [user.id, attempt]);

  if (error) return <main className="auth-layout"><section className="auth-card"><h1>Não foi possível abrir sua casa</h1><p className="auth-alert" role="alert">{error}</p><p>Confira se a migração SQL foi aplicada no projeto Supabase correto.</p><button className="btn btn-primary" onClick={() => setAttempt(n => n + 1)}>Tentar novamente</button><button className="btn btn-outline" onClick={() => void supabase?.auth.signOut()}>Sair</button></section></main>;
  if (!snapshot) return <main className="auth-layout"><div className="auth-card" role="status"><h1>Carregando sua casa…</h1><p>Consultando suas informações protegidas.</p></div></main>;
  return <App key={user.id} userId={user.id} userEmail={user.email ?? ''} initialData={snapshot.data} initialRevision={snapshot.revision} />;
}

export default function AuthGate() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getUser().then(({ data, error: issue }) => {
      if (!active) return;
      if (issue && !/session missing/i.test(issue.message)) setError(issue.message);
      setUser(data.user ?? null); setLoading(false);
    }).catch((problem: unknown) => {
      if (active) { setError(problem instanceof Error ? problem.message : 'Erro na autenticação.'); setLoading(false); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') { setRecovery(true); setUser(null); }
      else if (event === 'SIGNED_OUT') { setUser(null); setRecovery(false); }
      else if (event === 'SIGNED_IN' && !recovery) { setUser(session?.user ?? null); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  if (!supabase) return <main className="auth-layout"><section className="auth-card"><span className="auth-logo"><Home size={28}/></span><h1>Configure o Supabase</h1><p>Crie um projeto Supabase exclusivo para o My House, aplique a migração de banco e defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> no arquivo <code>.env.local</code>. Consulte <code>docs/SUPABASE_SETUP.md</code>.</p></section></main>;
  if (loading) return <main className="auth-layout"><div className="auth-card" role="status">Verificando sua sessão…</div></main>;
  if (error && !user) return <main className="auth-layout"><div className="auth-card"><p role="alert">{error}</p><button className="btn btn-outline" onClick={() => { setError(''); setLoading(true); window.location.reload(); }}>Recarregar</button></div></main>;
  if (!user || recovery) return <LoginScreen recoveryMode={recovery} onRecoveryComplete={() => {
    setRecovery(false);
    void supabase?.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }} />;
  return <UserHome key={user.id} user={user} />;
}
