import FloatingActions from './shared/FloatingActions';
import { parseRoute, routeHash, type Page, type AppRoute } from './navigation';
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
const HouseModel = lazy(() => import('./plan/HouseModel'));
import PlanEditor from './plan/PlanEditor';
import ProjectWorkspace from './features/projects/ProjectWorkspace';
import PurchaseEditor from './features/projects/PurchaseEditor';
import {
  changePurchaseStatus, currentStatus, deletePurchase as removePurchase,
  savePurchase as upsertPurchase, PURCHASE_STATUS_NAMES,
} from './features/projects/budgetDomain';
import { getWallSegments, scaleRoomGeometry, validateRoomGeometry } from './plan/geometry';
import GuidedRoomScan from './scan/GuidedRoomScan';
import Modal from './shared/Modal';
import { reconcileSpaces } from './domain/homeMigration';
import {
  ArrowDownToLine, ArrowRight, Box, Check, CheckCircle2, ChevronRight,
  ClipboardList, Clock3, Download, Edit3, FileClock, Filter, FolderKanban, Hammer, Home,
  Layers3, Menu, Package, Paintbrush, Plus, RotateCcw, Save, Search,
  ShoppingBasket, Trash2, Upload, Wallet, X, CloudOff, LogOut, ScanLine,
} from 'lucide-react';
import type { Direction, HomeData, Purchase, Room, Stage, TaskStatus } from './types';
import { DIRECTIONS, STAGES } from './types';
import { supabase } from './supabase';
import {
  directionNames, initialHome, money, newId,
  nextRoomPosition, nextStage, number, percentDone, priorityNames, priorityOrder,
  statusNames, validateHome, wallId,
} from './data';

type PurchaseDraft = Omit<Purchase, 'id' | 'createdAt'>;
const emptyPurchase = (): PurchaseDraft => ({
  name: '', category: 'Outros', roomId: '', priority: 'media',
  quantity: 1, unitPrice: 0, purchased: false, notes: '', url: '',
});
const localDate = (date: string) => new Date(date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });


type SyncStatus = 'saved' | 'pending' | 'saving' | 'error' | 'conflict';

type AppProps = { userId: string; userEmail: string; initialData: HomeData; initialRevision: number | null };

function App({ userId, userEmail, initialData, initialRevision }: AppProps) {
  const [home, setHome] = useState<HomeData>(initialData);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('saved');
  const [syncError, setSyncError] = useState('');
  const syncRevision = useRef<number | null>(initialRevision);
  const lastSaved = useRef(initialData);
  const latestHome = useRef(initialData);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const draftKey = `myhouse-unsynced:${userId}`;
  const [localDraft, setLocalDraft] = useState<HomeData | null>(() => {
    try { const raw = localStorage.getItem(`myhouse-unsynced:${userId}`); return raw ? validateHome(JSON.parse(raw)) : null; }
    catch { return null; }
  });
  const [route, setRoute] = useState<AppRoute>(()=>parseRoute(window.location.hash));
  const page=route.page;
  const selectedProject=page==='projects'?home.projects.find(project=>project.id===route.projectId)??null:null;
  const setPage=(next:Page)=>navigateRoute({page:next,projectId:null});
  const [selectedRoomId, setSelectedRoomId] = useState<string>(() => initialData.rooms[0]?.id ?? '');
  const [selectedWall, setSelectedWall] = useState<Direction>('leste');
  const [purchaseDraft, setPurchaseDraft] = useState<PurchaseDraft>(emptyPurchase);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseError,setPurchaseError]=useState('');
  const [roomOpen, setRoomOpen] = useState(false);
  const [workOpen, setWorkOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomDraft, setRoomDraft] = useState<Omit<Room, 'id'>>({ name: '', width: 3, length: 3, height: 2.7, x: 0, z: 0 });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [stage, setStage] = useState<Stage>('Raspagem');
  const [status, setStatus] = useState<TaskStatus>('em-andamento');
  const [workNote, setWorkNote] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  async function persistHome() {
    if (!supabase || inFlight.current || latestHome.current === lastSaved.current || !mounted.current) return;
    inFlight.current = true;
    setSyncStatus('saving');
    setSyncError('');
    const snapshot = latestHome.current;
    const version = syncRevision.current;
    try {
      // Condição de revisão impede que abas/dispositivos sobrescrevam dados antigos silenciosamente.
      const request = version === null
        ? supabase.from('user_homes').insert({ user_id: userId, data: snapshot, revision: 1 }).select('revision').single()
        : supabase.from('user_homes').update({ data: snapshot, revision: version + 1, updated_at: new Date().toISOString() })
            .eq('user_id', userId).eq('revision', version).select('revision').maybeSingle();
      const { data, error } = await request;
      if (!mounted.current) return;
      if (error) {
        if (error.code === '23505') { setSyncStatus('conflict'); setSyncError('O registro mudou em outro dispositivo. Exporte seu backup antes de atualizar a página.'); }
        else { setSyncStatus('error'); setSyncError(error.message); }
        return;
      }
      if (!data) {
        setSyncStatus('conflict');
        setSyncError('Outra sessão alterou os dados desta casa. Exporte seu backup antes de recarregar.');
        return;
      }
      syncRevision.current = data.revision as number;
      lastSaved.current = snapshot;
      if (latestHome.current === snapshot) {
        try { localStorage.removeItem(draftKey); } catch { /* storage não disponível */ }
        setSyncStatus('saved');
      } else {
        setSyncStatus('pending');
      }
    } catch (error) {
      if (mounted.current) { setSyncStatus('error'); setSyncError(error instanceof Error ? error.message : 'Falha na conexão.'); }
    } finally {
      inFlight.current = false;
      if (mounted.current && latestHome.current !== lastSaved.current && syncRevision.current !== version && syncStatus !== 'conflict') {
        window.setTimeout(() => void persistHome(), 250);
      }
    }
  }

  useEffect(() => {
    latestHome.current = home;
    if (home === lastSaved.current) return;
    try { localStorage.setItem(draftKey, JSON.stringify(home)); } catch { /* salvar na nuvem continua sendo prioritário */ }
    setSyncStatus('pending');
    const timer = window.setTimeout(() => void persistHome(), 850);
    return () => window.clearTimeout(timer);
  }, [home]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (latestHome.current !== lastSaved.current) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  function restoreLocalDraft() {
    if (!localDraft || !window.confirm('Restaurar o rascunho local e enviá-lo para esta conta? Isso substituirá os dados atualmente carregados.')) return;
    setHome(localDraft); setSelectedRoomId(localDraft.rooms[0]?.id ?? ''); setLocalDraft(null);
    setNotice('Rascunho restaurado. Aguarde a confirmação do salvamento na nuvem.');
  }
  function dismissLocalDraft() {
    if (!window.confirm('Descartar as alterações locais que ainda não foram sincronizadas?')) return;
    try { localStorage.removeItem(draftKey); } catch { /* noop */ }
    setLocalDraft(null);
  }
  async function signOut() {
    if (!supabase) return;
    if (latestHome.current !== lastSaved.current && !window.confirm('Existem alterações ainda não salvas na nuvem. Exporte um backup antes de sair. Sair mesmo assim?')) return;
    const { error } = await supabase.auth.signOut();
    if (error) setNotice(`Não foi possível sair: ${error.message}`);
  }
  useEffect(() => {
    if (!home.rooms.some(room => room.id === selectedRoomId)) setSelectedRoomId(home.rooms[0]?.id ?? '');
  }, [home.rooms, selectedRoomId]);
  useEffect(() => { const timeout = window.setTimeout(() => setNotice(''), 5000); return () => clearTimeout(timeout); }, [notice]);

  const totalPending = home.purchases.filter(p => !p.purchased).reduce((acc, p) => acc + p.unitPrice * p.quantity, 0);
  const totalBought = home.purchases.filter(p => p.purchased).reduce((acc, p) => acc + p.unitPrice * p.quantity, 0);
  const pendingCount = home.purchases.filter(p => !p.purchased).length;
  const completeWalls = home.rooms.flatMap(r => DIRECTIONS.map(d => wallId(r.id, d))).filter(key => percentDone(home.wallStages[key]) === 100).length;
  const totalWalls = home.rooms.length * 4;
  const selectedRoom = home.rooms.find(room => room.id === selectedRoomId);
  const currentWallId = wallId(selectedRoomId, selectedWall);
  const selectedStages = home.wallStages[currentWallId] ?? {};
  const selectedWallArea = selectedRoom ? getWallSegments(selectedRoom).filter(segment => segment.direction === selectedWall).reduce((sum, segment) => sum + segment.length * selectedRoom.height, 0) - (selectedRoom.openings ?? []).filter(opening => getWallSegments(selectedRoom)[opening.edge]?.direction === selectedWall).reduce((sum, opening) => sum + opening.width * opening.height, 0) : 0;
  const selectedWallLogs = home.logs.filter(l => l.roomId === selectedRoomId && l.direction === selectedWall);
  const next = nextStage(selectedStages);
  const categories = useMemo(() => Array.from(new Set(home.purchases.map(p => p.category).filter(Boolean))).sort(), [home.purchases]);
  const purchases = useMemo(() => home.purchases.filter(p => {
    const term = `${p.name} ${p.category} ${p.notes}`.toLowerCase();
    return term.includes(search.toLowerCase()) && (categoryFilter === 'todas' || p.category === categoryFilter)
      && (statusFilter === 'todos' || (statusFilter === 'pendentes' ? !p.purchased : p.purchased));
  }).sort((a, b) => Number(a.purchased) - Number(b.purchased) || priorityOrder[a.priority] - priorityOrder[b.priority] || a.name.localeCompare(b.name)),
  [home.purchases, search, categoryFilter, statusFilter]);
  const todoWalls = home.rooms.flatMap(room => DIRECTIONS.map(direction => ({
    room, direction, stages: home.wallStages[wallId(room.id, direction)] ?? {},
  }))).filter(item => percentDone(item.stages) < 100);

  function openPurchase(p?: Purchase) {
    setPurchaseError('');
    setEditingPurchaseId(p?.id ?? null);
    setPurchaseDraft(p ? {
      name: p.name, category: p.category, roomId: p.roomId, priority: p.priority,
      quantity: p.quantity, unitPrice: p.unitPrice, purchased: p.purchased, notes: p.notes, url: p.url,
      projectId:p.projectId,taskId:p.taskId,unit:p.unit,status:p.status,
      actualUnitPriceCents:p.actualUnitPriceCents,supplier:p.supplier,quotes:p.quotes,
    } : emptyPurchase());
    setPurchaseOpen(true);
  }
  function savePurchase(e: FormEvent) {
    e.preventDefault();
    try {
      if (purchaseDraft.url && !/^https?:\/\//i.test(purchaseDraft.url)) throw new Error('Use um link começando com https:// ou http://');
      const next=upsertPurchase(home,purchaseDraft,editingPurchaseId,new Date().toISOString(),newId());
      setHome(next);
      setPurchaseOpen(false);
      setPurchaseError('');
      setNotice(editingPurchaseId ? 'Item atualizado. Aguarde a sincronização.' : 'Item cadastrado. Aguarde a sincronização.');
    } catch(error) { setPurchaseError(error instanceof Error ? error.message : 'Não foi possível salvar este item.'); }
  }
  function deletePurchase(p: Purchase) {
    if (!window.confirm(`Excluir ${p.name} da lista?`)) return;
    try { setHome(removePurchase(home,p.id)); }
    catch(error) { setNotice(error instanceof Error ? error.message : 'Não foi possível excluir este item.'); }
  }
  function togglePurchase(id: string) {
    const item=home.purchases.find(p=>p.id===id);
    if(!item)return;
    try{setHome(changePurchaseStatus(home,id,item.purchased?'preciso':'comprado'));}
    catch(error){setNotice(error instanceof Error?error.message:'Não foi possível alterar a compra.');}
  }
  function openRoom(r?: Room) {
    setEditingRoomId(r?.id ?? null);
    setRoomDraft(r ? { name: r.name, width: r.width, length: r.length, height: r.height, x: r.x, z: r.z }
      : { name: '', width: 3, length: 3, height: 2.7, ...nextRoomPosition(home.rooms) });
    setRoomOpen(true);
  }
  function saveRoom(e: FormEvent) {
    e.preventDefault();
    try {
      if (!roomDraft.name.trim() || [roomDraft.width, roomDraft.length, roomDraft.height].some(n => !Number.isFinite(n) || n < 0.1 || n > 100)
          || [roomDraft.x, roomDraft.z].some(n => !Number.isFinite(n) || Math.abs(n) > 100)) {
        throw new Error('Confira o nome, as medidas (0,10 a 100 m) e as posições (-100 a 100 m).');
      }
      const previous = home.rooms.find(r => r.id === editingRoomId);
      const resized = previous ? scaleRoomGeometry(previous, roomDraft.width, roomDraft.length) : null;
      const room: Room = validateRoomGeometry({
        ...(resized ?? { id: newId(), ...roomDraft }),
        name: roomDraft.name.trim(),
        width: roomDraft.width, length: roomDraft.length, height: roomDraft.height,
        x: roomDraft.x, z: roomDraft.z,
      });
      setHome(prev => reconcileSpaces({ ...prev, rooms: editingRoomId ? prev.rooms.map(r => r.id === editingRoomId ? room : r) : [...prev.rooms, room] }));
      setSelectedRoomId(room.id);
      setRoomOpen(false);
      setPage('works');
      setNotice('Cômodo salvo. Sua geometria e seus registros foram preservados.');
    } catch (problem) {
      setNotice(problem instanceof Error ? problem.message : 'Não foi possível atualizar o cômodo.');
    }
  }
  function saveEditedPlan(updated: Room) {
    validateRoomGeometry(updated);
    setHome(prev => ({
      ...prev,
      rooms: prev.rooms.map(room => room.id === updated.id ? updated : room),
    }));
    setNotice('Planta salva. As alterações serão sincronizadas na sua conta.');
  }

  function completeRoomScan(draft: Omit<Room, 'id'>) {
    const room: Room = { id: newId(), ...draft };
    setHome(previous => reconcileSpaces({ ...previous, rooms: [...previous.rooms, room] }));
    setSelectedRoomId(room.id);
    setSelectedWall('leste');
    changePage('floorplan');
    setNotice('Cômodo criado com medidas conferidas. Aguarde o salvamento na nuvem.');
  }

  function deleteRoom(r: Room) {
    const affectedSpaceIds = home.spaces.filter(space => space.roomId === r.id).map(space => space.id);
    if (home.projects.some(project => project.spaceIds.some(id => affectedSpaceIds.includes(id)))) {
      setNotice('Este cômodo está vinculado a um projeto. Desvincule-o do projeto antes de excluir.');
      return;
    }
    if (!window.confirm(`Excluir ${r.name} e todos os registros de trabalho associados?`)) return;
    setHome(prev => reconcileSpaces({ ...prev, rooms: prev.rooms.filter(room => room.id !== r.id),
      purchases: prev.purchases.map(p => p.roomId === r.id ? { ...p, roomId: '' } : p),
      logs: prev.logs.filter(l => l.roomId !== r.id),
      wallStages: Object.fromEntries(Object.entries(prev.wallStages).filter(([key]) => !key.startsWith(`${r.id}:`))),
    }));
  }
  function saveWork(e: FormEvent) {
    e.preventDefault();
    if (!selectedRoom) return;
    const log = { id: newId(), roomId: selectedRoomId, direction: selectedWall, stage, status, note: workNote.trim(), createdAt: new Date().toISOString() };
    setHome(prev => ({ ...prev,
      logs: [log, ...prev.logs],
      wallStages: { ...prev.wallStages, [currentWallId]: { ...prev.wallStages[currentWallId], [stage]: status } },
    }));
    setWorkNote('');
    setWorkOpen(false);
    setNotice(`Atualização registrada para ${selectedRoom.name}, parede ${directionNames[selectedWall].toLowerCase()}.`);
  }
  function selectWall(roomId: string, direction: Direction) {
    setSelectedRoomId(roomId); setSelectedWall(direction);
    const step = nextStage(home.wallStages[wallId(roomId, direction)] ?? {});
    setStage(step ?? 'Pintura'); setStatus('em-andamento'); setWorkNote('');
  }
  function exportBackup() {
    const file = new Blob([JSON.stringify(home, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const a = document.createElement('a'); a.href = url; a.download = `casa-em-ordem-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  async function importBackup(file?: File) {
    if (!file) return;
    try {
      const imported = validateHome(JSON.parse(await file.text()));
      if (!window.confirm('O backup substituirá os dados desta conta no Supabase. Continuar?')) return;
      setHome(imported); setSelectedRoomId(imported.rooms[0]?.id ?? ''); setPage('overview');
      setNotice('Backup importado com sucesso.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Falha ao importar backup.'); }
    finally { if (fileInput.current) fileInput.current.value = ''; }
  }
  function clearAll() {
    if (!window.confirm('Apagar todos os cômodos, projetos, compras e registros desta conta no Supabase? Exporte um backup antes, se necessário.')) return;
    setHome({ ...structuredClone(initialHome), rooms: [] }); setSelectedRoomId(''); setNotice('Projeto zerado.');
  }

  const navItems: { id: Page; name: string; Icon: typeof Home }[] = [
    { id: 'overview', name: 'Visão geral', Icon: Home },
    { id: 'projects', name: 'Projetos', Icon: FolderKanban },
    { id: 'shopping', name: 'Lista de compras', Icon: ShoppingBasket },
    { id: 'floorplan', name: 'Planta 3D', Icon: Layers3 },
    { id: 'plan-editor', name: 'Editar planta 2D', Icon: Edit3 },
    { id: 'works', name: 'Obras', Icon: Hammer },
    { id: 'scan', name: 'Escanear cômodo', Icon: ScanLine },
    { id: 'history', name: 'Histórico de atividades', Icon: FileClock },
  ];
  function focusPage() {
    window.scrollTo({top:0});
    window.requestAnimationFrame(()=>document.getElementById('myhouse-page-content')?.focus({preventScroll:true}));
  }
  function navigateRoute(next:AppRoute,replace=false) {
    const hash=routeHash(next);
    if(window.location.hash!==hash){
      if(replace)window.history.replaceState(null,'',hash);
      else window.history.pushState(null,'',hash);
    }
    setRoute(next);
    setMobileNav(false);
    focusPage();
  }
  const changePage=(next:Page)=>navigateRoute({page:next,projectId:null});
  useEffect(()=>{
    if(!window.location.hash)window.history.replaceState(null,'',routeHash({page:'overview',projectId:null}));
    const onBack=()=>{
      setRoute(parseRoute(window.location.hash));
      setMobileNav(false);setPurchaseOpen(false);setRoomOpen(false);setWorkOpen(false);
      focusPage();
    };
    window.addEventListener('popstate',onBack);
    window.addEventListener('hashchange',onBack);
    return ()=>{
      window.removeEventListener('popstate',onBack);
      window.removeEventListener('hashchange',onBack);
    };
  },[]);
  useEffect(()=>{
    if(page==='projects'&&route.projectId&&!selectedProject){
      navigateRoute({page:'projects',projectId:null},true);
    }
  },[page,route.projectId,selectedProject]);
  useEffect(() => {
    if (!mobileNav) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNav(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileNav]);

  if (localDraft) return <main className="auth-layout"><section className="auth-card">
    <span className="auth-logo"><Home size={25}/></span>
    <h1>Há alterações não sincronizadas</h1>
    <p className="auth-intro">Foi encontrado um rascunho neste dispositivo para a conta <strong>{userEmail}</strong>. Escolha se deseja recuperá-lo antes de continuar. Seus dados na nuvem não serão alterados até você confirmar.</p>
    <button type="button" className="btn btn-primary full" onClick={restoreLocalDraft}>Recuperar alterações locais</button>
    <button type="button" className="btn btn-outline full" onClick={dismissLocalDraft}>Usar os dados da nuvem</button>
  </section></main>;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
      <div className="brand"><span className="brand-mark"><Home size={22} strokeWidth={2.4} /></span><div><strong>My House</strong><small>Meu espaço, meus planos</small></div></div>
      <div className="sidebar-section-label">MENU PRINCIPAL</div>
      <nav aria-label="Navegação principal">{navItems.map(({ id, name, Icon }) => <button type="button" key={id} aria-current={page === id ? 'page' : undefined} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => changePage(id)}><Icon size={19} /><span>{name}</span>{page === id && <ChevronRight className="nav-chevron" size={17} />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-account-actions"><span className="sidebar-account-label">MINHA CONTA</span><button className="sidebar-signout" type="button" onClick={() => void signOut()} aria-label="Sair da conta"><LogOut size={17}/><span>Sair da conta</span></button></div><span className="version">My House · F6</span></div>
    </aside>
    {mobileNav && <button className="mobile-overlay" aria-label="Fechar menu" onClick={() => setMobileNav(false)} />}
    <main className="main">
      <header className="topbar"><div className="topbar-start"><button type="button" className="icon-button mobile-menu" aria-label="Abrir menu" aria-expanded={mobileNav} onClick={() => setMobileNav(true)}><Menu size={22} /></button><nav className="breadcrumb" aria-label="Caminho de navegação">
          <button type="button" onClick={()=>changePage('overview')}>Myhouse</button><ChevronRight size={14} aria-hidden="true"/>
          {selectedProject?<><button type="button" onClick={()=>changePage('projects')}>Projetos</button><ChevronRight size={14} aria-hidden="true"/><strong aria-current="page" title={selectedProject.name}>{selectedProject.name}</strong></>:<strong aria-current="page">{navItems.find(n=>n.id===page)?.name}</strong>}
        </nav></div>
        <div className="topbar-actions"><input className="visually-hidden" ref={fileInput} type="file" tabIndex={-1} aria-label="Selecionar backup JSON" accept=".json,application/json" onChange={e => void importBackup(e.target.files?.[0])} /><button type="button" aria-label="Importar backup" className="btn btn-ghost compact" onClick={() => fileInput.current?.click()}><Upload size={17} /><span>Importar</span></button><button type="button" aria-label="Exportar backup" className="btn btn-outline compact" onClick={exportBackup}><Download size={17} /><span>Exportar backup</span></button></div>
      </header>
      <div className="page-content" id="myhouse-page-content" tabIndex={-1}>
        {notice && <div className="notice" role="status"><CheckCircle2 size={17} />{notice}<button onClick={() => setNotice('')} aria-label="Fechar aviso"><X size={16}/></button></div>}
        {(syncStatus === 'error' || syncStatus === 'conflict') && <div className="sync-alert" role="alert"><CloudOff size={18}/><span>{syncError} Seus dados continuam disponíveis nesta tela. Exporte um backup antes de fechar.</span>{syncStatus === 'error' && <button type="button" className="btn btn-outline compact" onClick={() => void persistHome()}>Tentar salvar</button>}<button className="btn btn-outline compact" onClick={exportBackup}>Exportar backup</button></div>}
        {localDraft && <div className="sync-alert"><span>Há alterações deste dispositivo ainda não sincronizadas com a sua conta. Deseja recuperá-las?</span><button className="btn btn-primary compact" onClick={restoreLocalDraft}>Recuperar rascunho</button><button className="btn btn-outline compact" onClick={dismissLocalDraft}>Descartar</button></div>}
        {page === 'overview' && <>
          <section className="welcome-banner"><div className="welcome-copy"><div className="eyebrow">PAINEL DA SUA CASA</div><h1>Uma casa organizada,<br /><em>um passo de cada vez.</em></h1><p>Compras, melhorias e reformas reunidas em um só lugar. Planeje hoje e acompanhe cada conquista.</p><div className="welcome-actions"><button className="btn btn-primary" onClick={() => changePage('projects')}><FolderKanban size={18}/>Meus projetos</button><button className="btn btn-white" onClick={() => openPurchase()}><Plus size={18}/>Adicionar compra</button></div></div><div className="hero-illustration" aria-hidden="true"><div className="illustration-circle"><Home size={116} strokeWidth={1.25} /><span className="illus-dot illus-dot-a"/><span className="illus-dot illus-dot-b"/></div></div></section>
          <div className="section-heading"><div><h2>Seu resumo</h2><p>O que está planejado e o que já foi resolvido.</p></div></div>
          <div className="stats-grid">
            <div className="stat-card"><span className="stat-icon orange"><ShoppingBasket size={22}/></span><span className="stat-label">Itens para comprar</span><strong>{pendingCount}</strong><small>{home.purchases.length} cadastrados no total</small></div>
            <div className="stat-card"><span className="stat-icon blue"><Wallet size={22}/></span><span className="stat-label">Orçamento pendente</span><strong className="money-stat">{money(totalPending)}</strong><small>Estimativa dos itens não comprados</small></div>
            <div className="stat-card"><span className="stat-icon green"><CheckCircle2 size={22}/></span><span className="stat-label">Compras concluídas</span><strong className="money-stat">{money(totalBought)}</strong><small>Valor registrado como comprado</small></div>
            <div className="stat-card"><span className="stat-icon purple"><Paintbrush size={22}/></span><span className="stat-label">Paredes finalizadas</span><strong>{completeWalls}<span className="subcount"> / {totalWalls}</span></strong><small>{home.logs.length} atualizações de trabalho</small></div>
          </div>
          <div className="two-column"><section className="panel"><div className="panel-heading"><div><h3>Próximas compras</h3><p>Organizadas por prioridade</p></div><button className="link-button" onClick={() => changePage('shopping')}>Ver todas <ArrowRight size={15}/></button></div>
            {home.purchases.filter(p => !p.purchased).length === 0 ? <div className="empty compact-empty"><Package size={28}/><strong>Nenhuma compra pendente</strong><span>Adicione utensílios, ferramentas ou qualquer item necessário.</span><button className="btn btn-outline" onClick={() => openPurchase()}><Plus size={16}/>Nova compra</button></div>
              : home.purchases.filter(p => !p.purchased).sort((a,b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 4).map(p => <div className="simple-row" key={p.id}><div className={`priority-dot ${p.priority}`}/><div className="simple-row-main"><strong>{p.name}</strong><small>{p.category} · {p.quantity} un.</small></div><span>{money(p.quantity * p.unitPrice)}</span></div>)}
          </section><section className="panel"><div className="panel-heading"><div><h3>Próximos trabalhos</h3><p>Etapas por parede</p></div><button className="link-button" onClick={() => changePage('works')}>Ver obras <ArrowRight size={15}/></button></div>
            {todoWalls.length === 0 ? <div className="empty compact-empty"><Hammer size={28}/><strong>Nenhum trabalho pendente</strong><span>Cadastre cômodos para acompanhar as paredes.</span></div>
              : todoWalls.slice(0, 4).map(({room,direction,stages}) => <button className="work-row" key={`${room.id}:${direction}`} onClick={() => { selectWall(room.id, direction); changePage('works'); }}><div className="work-row-icon"><Paintbrush size={19}/></div><div className="work-row-main"><strong>{room.name} · {directionNames[direction]}</strong><small>Próxima etapa: {nextStage(stages) ?? 'Finalizado'}</small></div><div className="mini-progress"><div style={{width: `${percentDone(stages)}%`}}/></div><span>{percentDone(stages)}%</span></button>)}
          </section></div>
          {home.rooms.some(r => r.id.startsWith('ex-')) && <p className="example-tip">A planta começa com cômodos de exemplo. Ajuste as medidas ou exclua esses cômodos na aba “Obras”.</p>}
        </>}
        {page === 'shopping' && <>
          <div className="page-title-row"><div><span className="eyebrow dark-eyebrow">ORGANIZAÇÃO</span><h1>Lista de compras</h1><p>De eletrodomésticos e panelas a tintas e ferramentas. Todas as categorias são permitidas.</p></div></div>
          <FloatingActions actions={[{label:'Adicionar item',onClick:()=>openPurchase()}]}/>
          <div className="shopping-summary"><div><span>Para comprar</span><strong>{pendingCount} itens</strong></div><div><span>Estimativa pendente</span><strong>{money(totalPending)}</strong></div><div><span>Total já comprado</span><strong>{money(totalBought)}</strong></div></div>
          <section className="panel shopping-panel"><div className="filters"><div className="search-box"><Search size={18}/><input aria-label="Pesquisar itens" placeholder="Buscar utensílio, material, ferramenta..." value={search} onChange={e => setSearch(e.target.value)}/></div><div className="filter-input"><Filter size={17}/><select value={categoryFilter} aria-label="Filtrar categoria" onChange={e => setCategoryFilter(e.target.value)}><option value="todas">Todas as categorias</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div><select className="status-select" aria-label="Filtrar situação" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="todos">Todos os status</option><option value="pendentes">Pendentes</option><option value="comprados">Comprados</option></select></div>
            {purchases.length === 0 ? <div className="empty"><ShoppingBasket size={38}/><strong>Nenhum item encontrado</strong><span>Adicione sua primeira compra ou altere os filtros.</span></div>
              : <div className="purchase-list">{purchases.map(p => <div key={p.id} className={`purchase-item ${p.purchased ? 'done' : ''}`}><button className={`purchase-check ${p.purchased ? 'checked' : ''}`} onClick={() => togglePurchase(p.id)} title={p.purchased ? 'Marcar como pendente' : 'Marcar como comprado'} aria-label={`Alterar status de ${p.name}`}>{p.purchased && <Check size={16}/>}</button><div className="purchase-info"><strong>{p.name}</strong><div className="purchase-meta"><span>{p.category}</span><span className="dot-separator"/><span>{home.rooms.find(r => r.id === p.roomId)?.name ?? 'Sem cômodo'}</span><span className="dot-separator"/><span>{p.quantity} {p.unit??'un.'}</span>{p.projectId&&<><span className="dot-separator"/><span>Projeto: {home.projects.find(pr=>pr.id===p.projectId)?.name??'—'}</span></>}</div>{p.notes && <small className="purchase-note">{p.notes}</small>}{p.url && <a className="item-link" href={p.url} target="_blank" rel="noopener noreferrer">Abrir link de referência</a>}</div><span className={`priority-pill ${p.priority}`}>{priorityNames[p.priority]}</span><div className="purchase-cost"><strong>{money(p.quantity * p.unitPrice)}</strong><small>{PURCHASE_STATUS_NAMES[currentStatus(p)]}</small>{p.purchased&&p.actualUnitPriceCents!=null&&<small>Pago: {money(p.actualUnitPriceCents*p.quantity/100)}</small>}</div><div className="row-actions"><button className="icon-button" aria-label={`Editar ${p.name}`} onClick={() => openPurchase(p)}><Edit3 size={17}/></button><button className="icon-button danger-hover" aria-label={`Excluir ${p.name}`} onClick={() => deletePurchase(p)}><Trash2 size={17}/></button></div></div>)}</div>}
          </section>
        </>}
        {page === 'projects' && <ProjectWorkspace home={home} userId={userId} selectedId={selectedProject?.id??null} onSelectProject={id=>navigateRoute({page:'projects',projectId:id})} onChange={setHome} onOpenRoom={roomId => { setSelectedRoomId(roomId); changePage('floorplan'); }}/>} 
        {page === 'floorplan' && <>
          <div className="page-title-row"><div><span className="eyebrow dark-eyebrow">VISUALIZAÇÃO</span><h1>Planta 3D</h1><p>Visualize os cômodos, incluindo portas e janelas. O desenho é editado em outra tela.</p></div><div className="scan-entry-actions"><button className="btn btn-outline" onClick={() => changePage('plan-editor')}><Edit3 size={17}/>Editar planta 2D</button><button className="btn btn-primary" onClick={() => changePage('scan')}><ScanLine size={17}/>Escanear cômodo</button><button className="btn btn-outline" onClick={() => changePage('works')}><Hammer size={17}/>Abrir Obras</button></div></div>
          <div className="floor-layout floor-layout-viewer-only"><section className="panel viewer-panel floorplan-only"><div className="panel-heading"><div><h3>Modelo tridimensional</h3><p>Toque numa parede para selecionar · Arraste para girar · Use o zoom para aproximar</p></div><span className="viewer-badge"><Box size={15}/>Interativo</span></div>
            <div className="scene">{home.rooms.length ? <Suspense fallback={<div role="status" className="empty">Carregando a visualização 3D… Use o editor 2D se preferir.</div>}><HouseModel rooms={home.rooms} selectedRoomId={selectedRoomId} selectedWall={selectedWall} onSelect={selectWall}/></Suspense> : <div className="empty"><Layers3 size={38}/><strong>Planta vazia</strong><span>Cadastre ou escaneie um cômodo para começar.</span><button className="btn btn-primary" onClick={() => changePage('scan')}><ScanLine size={17}/>Escanear cômodo</button><button className="btn btn-outline" onClick={() => changePage('works')}><Plus size={17}/>Cadastro manual</button></div>}</div>
            <div className="room-list-header"><strong>Cômodos</strong><span>{home.rooms.length} cômodo(s)</span></div>
            <div className="room-chips">{home.rooms.map(r => <div key={r.id} className={`room-chip ${selectedRoomId === r.id ? 'selected' : ''}`}><button type="button" className="chip-main" aria-pressed={selectedRoomId === r.id} onClick={() => selectWall(r.id, selectedWall)}><Home size={17}/><span><strong>{r.name}</strong><small>{number(r.width)} × {number(r.length)} × {number(r.height)} m</small></span></button></div>)}</div>
            {home.rooms.some(r => r.id.startsWith('ex-')) && <p className="viewer-warning">Medidas e posições de exemplo. Confira a distribuição real e ajuste portas e janelas no editor 2D.</p>}
          </section>
          </div>
          {selectedRoom && <section className="panel wall-preview" aria-label="Parede selecionada"><div className="wall-preview-heading"><div><span className="eyebrow dark-eyebrow">PAREDE SELECIONADA</span><h2>{selectedRoom.name} · {directionNames[selectedWall]}</h2><p>{number(selectedWallArea)} m² estimados · {percentDone(selectedStages)}% concluído</p></div><button className="btn btn-primary" onClick={() => changePage('works')}><ArrowRight size={17}/>Ver em Obras</button></div><div className="wall-preview-selector" role="group" aria-label="Selecionar parede">{DIRECTIONS.map(d => <button type="button" key={d} aria-pressed={selectedWall === d} className={selectedWall === d ? 'active' : ''} onClick={() => selectWall(selectedRoomId, d)}>{directionNames[d]}</button>)}</div></section>}
        </>}

        {page === 'scan' && <GuidedRoomScan existingRooms={home.rooms} onComplete={completeRoomScan} onCancel={() => changePage('works')} />}
        {page === 'plan-editor' && <PlanEditor
          rooms={home.rooms}
          selectedRoomId={selectedRoomId}
          onSelect={setSelectedRoomId}
          onSave={saveEditedPlan}
          onBack={() => changePage('floorplan')}
        />}
        {page === 'works' && <>
          <div className="page-title-row"><div><span className="eyebrow dark-eyebrow">ACOMPANHAMENTO</span><h1>Obras</h1><p>Registre o andamento de cada parede, sem precisar passar pela planta.</p></div></div>
          <FloatingActions actions={[
            {label:'Adicionar cômodo',onClick:()=>openRoom()},
            {label:'Escanear cômodo',icon:<ScanLine size={18}/>,onClick:()=>changePage('scan')},
            {label:'Registrar atualização',icon:<Save size={18}/>,disabled:!selectedRoom,onClick:()=>setWorkOpen(true)}
          ]}/>
          <div className="works-layout">
          <section className="panel inspector-panel"><div className="panel-heading inspector-heading"><div><h3>Acompanhamento da parede</h3><p>Registre o andamento e mantenha um histórico.</p></div><Hammer size={20} className="subtle-icon"/></div>
            {selectedRoom ? <><label className="field-label" htmlFor="work-room">Cômodo</label><select id="work-room" className="field-input" value={selectedRoomId} onChange={e => selectWall(e.target.value, selectedWall)}>{home.rooms.map(r => <option value={r.id} key={r.id}>{r.name}</option>)}</select>
              <span className="field-label wall-label" id="work-wall-label">Parede</span><div className="wall-tabs" role="group" aria-labelledby="work-wall-label">{DIRECTIONS.map(d => <button type="button" key={d} aria-pressed={selectedWall === d} className={selectedWall === d ? 'active' : ''} onClick={() => selectWall(selectedRoomId, d)}>{directionNames[d]}</button>)}</div>
              <div className="wall-metrics"><div><span>Área estimada</span><strong>{number(selectedWallArea)} m²</strong></div><div><span>Etapas concluídas</span><strong>{percentDone(selectedStages)}%</strong></div></div>
              <div className="progress-track"><span style={{width: `${percentDone(selectedStages)}%`}}/></div>
              
              <div className="stages-heading"><strong>Etapas da parede</strong><span>{STAGES.filter(s => selectedStages[s] === 'concluido').length} de {STAGES.length}</span></div>
              <div className="stage-list">{STAGES.map((item, i) => <button type="button" aria-pressed={stage === item} key={item} className={`stage-row ${stage === item ? 'selected-stage' : ''}`} onClick={() => { setStage(item); setStatus(selectedStages[item] ?? 'em-andamento'); }}><span className={`stage-indicator ${selectedStages[item] ?? 'nao-iniciado'}`}>{selectedStages[item] === 'concluido' ? <Check size={14}/> : i + 1}</span><span><strong>{item}</strong><small>{statusNames[selectedStages[item] ?? 'nao-iniciado']}</small></span>{stage === item && <ChevronRight size={16}/>}</button>)}</div>
              <div className="next-step"><Clock3 size={18}/><div><strong>Próxima etapa sugerida</strong><p>{next ? `${next} — ${statusNames[selectedStages[next] ?? 'nao-iniciado'].toLowerCase()}` : 'Todas as etapas foram concluídas.'}</p></div></div>
              {selectedWallLogs.length > 0 && <div className="wall-log"><strong>Últimas atualizações</strong>{selectedWallLogs.slice(0, 3).map(log => <div className="tiny-log" key={log.id}><span>{localDate(log.createdAt)}</span><strong>{log.stage} · {statusNames[log.status]}</strong>{log.note && <p>{log.note}</p>}</div>)}</div>}
            </> : <div className="empty"><Home size={30}/><strong>Selecione um cômodo</strong><span>Cadastre seu primeiro cômodo para acompanhar a reforma.</span></div>}
          </section>
          <section className="panel rooms-manager"><div className="panel-heading"><div><h3>Gerenciar cômodos</h3><p>Cadastre, ajuste medidas ou exclua cômodos da planta.</p></div></div>
            <div className="rooms-manager-list">{home.rooms.map(r => <div key={r.id} className={`room-chip ${selectedRoomId === r.id ? 'selected' : ''}`}><button className="chip-main" onClick={() => selectWall(r.id, selectedWall)}><Home size={17}/><span><strong>{r.name}</strong><small>{number(r.width)} × {number(r.length)} × {number(r.height)} m</small></span></button><button className="icon-button" title={`Editar ${r.name}`} aria-label={`Editar ${r.name}`} onClick={() => openRoom(r)}><Edit3 size={15}/></button><button className="icon-button danger-hover" title={`Excluir ${r.name}`} aria-label={`Excluir ${r.name}`} onClick={() => deleteRoom(r)}><Trash2 size={15}/></button></div>)}</div>
            {home.rooms.length === 0 && <p className="rooms-empty">Nenhum cômodo cadastrado.</p>}
            <div className="rooms-manager-footer"><button className="link-button" onClick={() => changePage('plan-editor')}><Edit3 size={16}/>Editar formato, portas e janelas <ArrowRight size={15}/></button><button className="link-button" onClick={() => changePage('floorplan')}><Box size={16}/>Visualizar Planta 3D <ArrowRight size={15}/></button></div>
          </section></div>
        </>}
        {page === 'history' && <><div className="page-title-row"><div><span className="eyebrow dark-eyebrow">RASTREABILIDADE</span><h1>Histórico de atividades</h1><p>O que foi feito, onde foi feito e quando aconteceu.</p></div><button className="btn btn-outline" onClick={exportBackup}><ArrowDownToLine size={17}/>Exportar dados</button></div>
          <section className="panel history-panel">{home.logs.length === 0 ? <div className="empty"><ClipboardList size={38}/><strong>O histórico ainda está vazio</strong><span>Abra Obras, escolha uma parede e registre a primeira atualização.</span><button className="btn btn-primary" onClick={() => changePage('works')}><Hammer size={17}/>Registrar obra</button></div> : <div className="timeline">{home.logs.map(log => <article className="timeline-row" key={log.id}><span className="timeline-icon"><Hammer size={17}/></span><div><span className="timeline-date">{localDate(log.createdAt)}</span><h3>{log.stage} · {statusNames[log.status]}</h3><p><strong>{home.rooms.find(r => r.id === log.roomId)?.name ?? 'Cômodo excluído'}</strong> — Parede {directionNames[log.direction].toLowerCase()}</p>{log.note && <div className="timeline-note">{log.note}</div>}</div></article>)}</div>}</section>
          <div className="history-footer"><span>Seus dados são sincronizados com sua conta Supabase. O backup JSON continua disponível.</span><button className="link-button danger-link" onClick={clearAll}><RotateCcw size={16}/>Zerar projeto</button></div>
        </>}
      </div>
    </main>
    {workOpen&&selectedRoom&&<Modal title="Registrar atualização" onClose={()=>setWorkOpen(false)}>
      <form onSubmit={saveWork} className="modal-form"><div className="form-row"><div className="field"><label htmlFor="stage">Etapa</label><select id="stage" value={stage} onChange={e => { const s = e.target.value as Stage; setStage(s); setStatus(selectedStages[s] ?? 'em-andamento'); }}>{STAGES.map(s => <option key={s}>{s}</option>)}</select></div><div className="field"><label htmlFor="step-status">Situação</label><select id="step-status" value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>{Object.entries(statusNames).map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select></div></div><div className="field"><label htmlFor="work-note">O que você fez? (opcional)</label><textarea id="work-note" rows={3} value={workNote} onChange={e => setWorkNote(e.target.value)} placeholder="Ex.: Removi a tinta descascada da metade superior da parede." /></div><button className="btn btn-primary full" type="submit"><Save size={17}/>Salvar atualização</button></form>
    </Modal>}
    {purchaseOpen && <Modal title={editingPurchaseId ? 'Editar item de compra' : 'Adicionar à lista de compras'} onClose={() => setPurchaseOpen(false)}>
      <PurchaseEditor home={home} draft={purchaseDraft} setDraft={setPurchaseDraft} onSubmit={savePurchase} onCancel={()=>setPurchaseOpen(false)}/>
      {purchaseError&&<p className="budget-error" role="alert">{purchaseError}</p>}
    </Modal>}
    {roomOpen && <Modal title={editingRoomId ? 'Editar cômodo' : 'Adicionar cômodo'} onClose={() => setRoomOpen(false)}><form className="modal-form" onSubmit={saveRoom}><div className="field"><label htmlFor="r-name">Nome do cômodo *</label><input id="r-name" required placeholder="Ex.: Quarto principal, cozinha, banheiro" value={roomDraft.name} onChange={e => setRoomDraft(p => ({...p, name: e.target.value}))}/></div>
      <p className="form-hint">Informe as medidas em metros. A posição X/Z determina onde o cômodo aparece no modelo da casa.</p>
      <div className="form-row three">{([['width','Largura (m)'],['length','Comprimento (m)'],['height','Altura (m)']] as const).map(([key,label]) => <div className="field" key={key}><label htmlFor={`r-${key}`}>{label}</label><input id={`r-${key}`} type="number" min="0.1" max="100" step="0.01" required value={roomDraft[key]} onChange={e => setRoomDraft(p => ({...p, [key]: Number(e.target.value)}))}/></div>)}</div>
      <div className="form-row">{([['x','Posição X (m)'],['z','Posição Z (m)']] as const).map(([key,label]) => <div className="field" key={key}><label htmlFor={`r-${key}`}>{label}</label><input id={`r-${key}`} type="number" min="-100" max="100" step="0.01" required value={roomDraft[key]} onChange={e => setRoomDraft(p => ({...p, [key]: Number(e.target.value)}))}/></div>)}</div>
      <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setRoomOpen(false)}>Cancelar</button><button type="submit" className="btn btn-primary"><Check size={17}/>Salvar cômodo</button></div>
    </form></Modal>}
  </div>;
}
export default App;
