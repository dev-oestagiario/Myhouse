import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import GuidedRoomScan from './scan/GuidedRoomScan';
import { Edges, OrbitControls } from '@react-three/drei';
import {
  ArrowDownToLine, ArrowRight, Box, Check, CheckCircle2, ChevronRight,
  ClipboardList, Clock3, Download, Edit3, FileClock, Filter, Hammer, Home,
  Layers3, Menu, Package, Paintbrush, Plus, RotateCcw, Save, Search,
  ShoppingBasket, Trash2, Upload, Wallet, X, Cloud, CloudOff, LogOut, RefreshCw, ScanLine,
} from 'lucide-react';
import type { Direction, HomeData, Priority, Purchase, Room, Stage, TaskStatus } from './types';
import { DIRECTIONS, STAGES } from './types';
import { supabase } from './supabase';
import {
  directionNames, initialHome, money, newId,
  nextRoomPosition, nextStage, number, percentDone, priorityNames, priorityOrder,
  statusNames, validateHome, wallId,
} from './data';

type Page = 'overview' | 'shopping' | 'floorplan' | 'works' | 'scan' | 'history';
type PurchaseDraft = Omit<Purchase, 'id' | 'createdAt'>;
const emptyPurchase = (): PurchaseDraft => ({
  name: '', category: 'Outros', roomId: '', priority: 'media',
  quantity: 1, unitPrice: 0, purchased: false, notes: '', url: '',
});
const localDate = (date: string) => new Date(date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const moneyInput = (n: number) => (Number.isFinite(n) ? String(n) : '0');

function HouseModel({ rooms, selectedRoomId, selectedWall, onSelect }: {
  rooms: Room[];
  selectedRoomId: string;
  selectedWall: Direction;
  onSelect: (id: string, direction: Direction) => void;
}) {
  const minX = Math.min(...rooms.map(r => r.x));
  const maxX = Math.max(...rooms.map(r => r.x + r.width));
  const minZ = Math.min(...rooms.map(r => r.z));
  const maxZ = Math.max(...rooms.map(r => r.z + r.length));
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const size = Math.max(maxX - minX, maxZ - minZ, 4);
  const height = Math.max(...rooms.map(r => r.height));
  const wallsForRoom = (room: Room) => [
    { direction: 'norte' as Direction, position: [room.x + room.width / 2, room.height / 2, room.z] as [number, number, number], size: [room.width, room.height, 0.08] as [number, number, number] },
    { direction: 'sul' as Direction, position: [room.x + room.width / 2, room.height / 2, room.z + room.length] as [number, number, number], size: [room.width, room.height, 0.08] as [number, number, number] },
    { direction: 'leste' as Direction, position: [room.x + room.width, room.height / 2, room.z + room.length / 2] as [number, number, number], size: [0.08, room.height, room.length] as [number, number, number] },
    { direction: 'oeste' as Direction, position: [room.x, room.height / 2, room.z + room.length / 2] as [number, number, number], size: [0.08, room.height, room.length] as [number, number, number] },
  ];
  return (
    <Canvas key={`${rooms.map(r => [r.id, r.width, r.length, r.height, r.x, r.z].join(':')).join('|')}`}
      camera={{ position: [cx + size * 1.1, height + size * 1.15, cz + size * 1.2], fov: 43 }}
      gl={{ antialias: true }}>
      <color attach="background" args={['#f3f5f3']} />
      <ambientLight intensity={1.25} />
      <directionalLight position={[7, 12, 8]} intensity={1.8} />
      <gridHelper args={[Math.max(30, size * 3), 30, '#d5ddd9', '#e0e8e3']} position={[cx, -0.11, cz]} />
      {rooms.map((room, idx) => (
        <group key={room.id}>
          <mesh position={[room.x + room.width / 2, -0.04, room.z + room.length / 2]}>
            <boxGeometry args={[room.width, 0.08, room.length]} />
            <meshStandardMaterial color={room.id === selectedRoomId ? '#e0ece5' : idx % 2 ? '#e8edf0' : '#f5ede3'} />
            <Edges color="#b8c9c2" threshold={10} />
          </mesh>
          {wallsForRoom(room).map(w => {
            const active = room.id === selectedRoomId && selectedWall === w.direction;
            return (
              <mesh key={w.direction} position={w.position} onClick={e => { e.stopPropagation(); onSelect(room.id, w.direction); }}>
                <boxGeometry args={w.size} />
                <meshStandardMaterial color={active ? '#e9a164' : '#9aada9'} transparent opacity={active ? 0.76 : 0.36} depthWrite={false} />
                <Edges color={active ? '#bc692c' : '#91aaa3'} threshold={15} />
              </mesh>
            );
          })}
        </group>
      ))}
      <OrbitControls target={[cx, 0, cz]} enablePan enableZoom minDistance={2} maxDistance={80} maxPolarAngle={Math.PI / 2.05} />
    </Canvas>
  );
}

function Modal({ title, onClose, children }: { title: string, onClose: () => void, children: ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-heading"><h2>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button></div>
      {children}
    </section>
  </div>;
}

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
  const [page, setPage] = useState<Page>('overview');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(() => initialData.rooms[0]?.id ?? '');
  const [selectedWall, setSelectedWall] = useState<Direction>('leste');
  const [purchaseDraft, setPurchaseDraft] = useState<PurchaseDraft>(emptyPurchase);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
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
    setEditingPurchaseId(p?.id ?? null);
    setPurchaseDraft(p ? {
      name: p.name, category: p.category, roomId: p.roomId, priority: p.priority,
      quantity: p.quantity, unitPrice: p.unitPrice, purchased: p.purchased, notes: p.notes, url: p.url,
    } : emptyPurchase());
    setPurchaseOpen(true);
  }
  function savePurchase(e: FormEvent) {
    e.preventDefault();
    if (!purchaseDraft.name.trim() || !purchaseDraft.category.trim() || purchaseDraft.quantity <= 0 || !Number.isFinite(purchaseDraft.unitPrice) || purchaseDraft.unitPrice < 0) return;
    if (purchaseDraft.url && !/^https?:\/\//i.test(purchaseDraft.url)) { setNotice('Use um link começando com https:// ou http://'); return; }
    setHome(prev => ({ ...prev, purchases: editingPurchaseId
      ? prev.purchases.map(p => p.id === editingPurchaseId ? { ...p, ...purchaseDraft, name: purchaseDraft.name.trim(), category: purchaseDraft.category.trim() } : p)
      : [{ ...purchaseDraft, id: newId(), createdAt: new Date().toISOString(), name: purchaseDraft.name.trim(), category: purchaseDraft.category.trim() }, ...prev.purchases],
    }));
    setPurchaseOpen(false);
    setNotice(editingPurchaseId ? 'Item atualizado.' : 'Item cadastrado.');
  }
  function deletePurchase(p: Purchase) {
    if (!window.confirm(`Excluir ${p.name} da lista?`)) return;
    setHome(prev => ({ ...prev, purchases: prev.purchases.filter(item => item.id !== p.id) }));
  }
  function togglePurchase(id: string) {
    setHome(prev => ({ ...prev, purchases: prev.purchases.map(p => p.id === id ? { ...p, purchased: !p.purchased } : p) }));
  }
  function openRoom(r?: Room) {
    setEditingRoomId(r?.id ?? null);
    setRoomDraft(r ? { name: r.name, width: r.width, length: r.length, height: r.height, x: r.x, z: r.z }
      : { name: '', width: 3, length: 3, height: 2.7, ...nextRoomPosition(home.rooms) });
    setRoomOpen(true);
  }
  function saveRoom(e: FormEvent) {
    e.preventDefault();
    if (!roomDraft.name.trim() || [roomDraft.width, roomDraft.length, roomDraft.height].some(n => !Number.isFinite(n) || n <= 0)
        || [roomDraft.x, roomDraft.z].some(n => !Number.isFinite(n))) return;
    const room = { ...roomDraft, name: roomDraft.name.trim(), id: editingRoomId ?? newId() };
    setHome(prev => ({ ...prev, rooms: editingRoomId ? prev.rooms.map(r => r.id === editingRoomId ? room : r) : [...prev.rooms, room] }));
    setSelectedRoomId(room.id);
    setRoomOpen(false);
    setPage('works');
    setNotice('Cômodo salvo. Ele já aparece na Planta 3D.');
  }
  function completeRoomScan(draft: Omit<Room, 'id'>) {
    const room: Room = { id: newId(), ...draft };
    setHome(previous => ({ ...previous, rooms: [...previous.rooms, room] }));
    setSelectedRoomId(room.id);
    setSelectedWall('leste');
    changePage('floorplan');
    setNotice('Cômodo criado com medidas conferidas. Aguarde o salvamento na nuvem.');
  }

  function deleteRoom(r: Room) {
    if (!window.confirm(`Excluir ${r.name} e todos os registros de trabalho associados?`)) return;
    setHome(prev => ({ ...prev, rooms: prev.rooms.filter(room => room.id !== r.id),
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
    if (!window.confirm('Apagar todos os cômodos, compras e registros desta conta no Supabase? Exporte um backup antes, se necessário.')) return;
    setHome({ ...structuredClone(initialHome), rooms: [] }); setSelectedRoomId(''); setNotice('Projeto zerado.');
  }

  const navItems: { id: Page; name: string; Icon: typeof Home }[] = [
    { id: 'overview', name: 'Visão geral', Icon: Home },
    { id: 'shopping', name: 'Lista de compras', Icon: ShoppingBasket },
    { id: 'floorplan', name: 'Planta 3D', Icon: Layers3 },
    { id: 'works', name: 'Obras', Icon: Hammer },
    { id: 'scan', name: 'Escanear cômodo', Icon: ScanLine },
    { id: 'history', name: 'Histórico de atividades', Icon: FileClock },
  ];
  const changePage = (newPage: Page) => { setPage(newPage); setMobileNav(false); window.scrollTo({ top: 0 }); };

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
      <nav aria-label="Navegação principal">{navItems.map(({ id, name, Icon }) => <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => changePage(id)}><Icon size={19} /><span>{name}</span>{page === id && <ChevronRight className="nav-chevron" size={17} />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="save-info"><CheckCircle2 size={18} /><div><strong>{syncStatus === 'saved' ? 'Salvo na nuvem' : syncStatus === 'saving' ? 'Salvando na nuvem…' : syncStatus === 'pending' ? 'Aguardando sincronização' : 'Não foi possível sincronizar'}</strong><span>Dados individuais vinculados à sua conta</span></div></div><span className="version">Versão inicial · 1.0</span></div>
    </aside>
    {mobileNav && <button className="mobile-overlay" aria-label="Fechar menu" onClick={() => setMobileNav(false)} />}
    <main className="main">
      <header className="topbar"><div className="topbar-start"><button className="icon-button mobile-menu" aria-label="Abrir menu" onClick={() => setMobileNav(true)}><Menu size={22} /></button><div className="breadcrumb">Minha casa <ChevronRight size={14}/><strong>{navItems.find(n => n.id === page)?.name}</strong></div></div>
        <div className="topbar-actions"><input className="visually-hidden" ref={fileInput} type="file" accept=".json,application/json" onChange={e => void importBackup(e.target.files?.[0])} /><button className="btn btn-ghost compact" onClick={() => fileInput.current?.click()}><Upload size={17} /><span>Importar</span></button><button className="btn btn-outline compact" onClick={exportBackup}><Download size={17} /><span>Exportar backup</span></button><button className="btn btn-ghost compact" onClick={() => void signOut()} aria-label="Sair da conta"><LogOut size={17}/><span>Sair</span></button></div>
      </header>
      <div className="page-content">
        {notice && <div className="notice" role="status"><CheckCircle2 size={17} />{notice}<button onClick={() => setNotice('')} aria-label="Fechar aviso"><X size={16}/></button></div>}
        <div className="account-line"><span>Conectado como <strong>{userEmail}</strong></span><span className={`sync-indicator ${syncStatus}`} role="status">{syncStatus === 'saved' ? <Cloud size={16}/> : syncStatus === 'saving' ? <RefreshCw size={16}/> : syncStatus === 'pending' ? <Cloud size={16}/> : <CloudOff size={16}/>} {syncStatus === 'saved' ? 'Salvo na nuvem' : syncStatus === 'saving' ? 'Sincronizando…' : syncStatus === 'pending' ? 'Alterações pendentes' : 'Falha na sincronização'}</span></div>
        {(syncStatus === 'error' || syncStatus === 'conflict') && <div className="sync-alert" role="alert"><CloudOff size={18}/><span>{syncError} Seus dados continuam disponíveis nesta tela. Exporte um backup antes de fechar.</span>{syncStatus === 'error' && <button type="button" className="btn btn-outline compact" onClick={() => void persistHome()}>Tentar salvar</button>}<button className="btn btn-outline compact" onClick={exportBackup}>Exportar backup</button></div>}
        {localDraft && <div className="sync-alert"><span>Há alterações deste dispositivo ainda não sincronizadas com a sua conta. Deseja recuperá-las?</span><button className="btn btn-primary compact" onClick={restoreLocalDraft}>Recuperar rascunho</button><button className="btn btn-outline compact" onClick={dismissLocalDraft}>Descartar</button></div>}
        {page === 'overview' && <>
          <section className="welcome-banner"><div className="welcome-copy"><div className="eyebrow">PAINEL DA SUA CASA</div><h1>Uma casa organizada,<br /><em>um passo de cada vez.</em></h1><p>Compras, melhorias e reformas reunidas em um só lugar. Planeje hoje e acompanhe cada conquista.</p><div className="welcome-actions"><button className="btn btn-primary" onClick={() => openPurchase()}><Plus size={18}/>Adicionar item</button><button className="btn btn-white" onClick={() => changePage('floorplan')}><Box size={18}/>Explorar planta 3D</button></div></div><div className="hero-illustration" aria-hidden="true"><div className="illustration-circle"><Home size={116} strokeWidth={1.25} /><span className="illus-dot illus-dot-a"/><span className="illus-dot illus-dot-b"/></div></div></section>
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
          <div className="page-title-row"><div><span className="eyebrow dark-eyebrow">ORGANIZAÇÃO</span><h1>Lista de compras</h1><p>De eletrodomésticos e panelas a tintas e ferramentas. Todas as categorias são permitidas.</p></div><button className="btn btn-primary" onClick={() => openPurchase()}><Plus size={18}/>Adicionar item</button></div>
          <div className="shopping-summary"><div><span>Para comprar</span><strong>{pendingCount} itens</strong></div><div><span>Estimativa pendente</span><strong>{money(totalPending)}</strong></div><div><span>Total já comprado</span><strong>{money(totalBought)}</strong></div></div>
          <section className="panel shopping-panel"><div className="filters"><div className="search-box"><Search size={18}/><input aria-label="Pesquisar itens" placeholder="Buscar utensílio, material, ferramenta..." value={search} onChange={e => setSearch(e.target.value)}/></div><div className="filter-input"><Filter size={17}/><select value={categoryFilter} aria-label="Filtrar categoria" onChange={e => setCategoryFilter(e.target.value)}><option value="todas">Todas as categorias</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div><select className="status-select" aria-label="Filtrar situação" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="todos">Todos os status</option><option value="pendentes">Pendentes</option><option value="comprados">Comprados</option></select></div>
            {purchases.length === 0 ? <div className="empty"><ShoppingBasket size={38}/><strong>Nenhum item encontrado</strong><span>Adicione sua primeira compra ou altere os filtros.</span><button className="btn btn-primary" onClick={() => openPurchase()}><Plus size={17}/>Adicionar item</button></div>
              : <div className="purchase-list">{purchases.map(p => <div key={p.id} className={`purchase-item ${p.purchased ? 'done' : ''}`}><button className={`purchase-check ${p.purchased ? 'checked' : ''}`} onClick={() => togglePurchase(p.id)} title={p.purchased ? 'Marcar como pendente' : 'Marcar como comprado'} aria-label={`Alterar status de ${p.name}`}>{p.purchased && <Check size={16}/>}</button><div className="purchase-info"><strong>{p.name}</strong><div className="purchase-meta"><span>{p.category}</span><span className="dot-separator"/><span>{home.rooms.find(r => r.id === p.roomId)?.name ?? 'Sem cômodo'}</span><span className="dot-separator"/><span>{p.quantity} un.</span></div>{p.notes && <small className="purchase-note">{p.notes}</small>}{p.url && <a className="item-link" href={p.url} target="_blank" rel="noopener noreferrer">Abrir link de referência</a>}</div><span className={`priority-pill ${p.priority}`}>{priorityNames[p.priority]}</span><div className="purchase-cost"><strong>{money(p.quantity * p.unitPrice)}</strong><small>{p.purchased ? 'Comprado' : 'Pendente'}</small></div><div className="row-actions"><button className="icon-button" aria-label={`Editar ${p.name}`} onClick={() => openPurchase(p)}><Edit3 size={17}/></button><button className="icon-button danger-hover" aria-label={`Excluir ${p.name}`} onClick={() => deletePurchase(p)}><Trash2 size={17}/></button></div></div>)}</div>}
          </section>
        </>}
        {page === 'floorplan' && <>
          <div className="page-title-row"><div><span className="eyebrow dark-eyebrow">VISUALIZAÇÃO</span><h1>Planta 3D</h1><p>Visualize os cômodos e selecione paredes. O cadastro e as atualizações ficam em Obras.</p></div><div className="scan-entry-actions"><button className="btn btn-primary" onClick={() => changePage('scan')}><ScanLine size={17}/>Escanear cômodo</button><button className="btn btn-outline" onClick={() => changePage('works')}><Hammer size={17}/>Abrir Obras</button></div></div>
          <div className="floor-layout floor-layout-viewer-only"><section className="panel viewer-panel floorplan-only"><div className="panel-heading"><div><h3>Modelo tridimensional</h3><p>Toque numa parede para selecionar · Arraste para girar · Use o zoom para aproximar</p></div><span className="viewer-badge"><Box size={15}/>Interativo</span></div>
            <div className="scene">{home.rooms.length ? <HouseModel rooms={home.rooms} selectedRoomId={selectedRoomId} selectedWall={selectedWall} onSelect={selectWall}/> : <div className="empty"><Layers3 size={38}/><strong>Planta vazia</strong><span>Cadastre ou escaneie um cômodo para começar.</span><button className="btn btn-primary" onClick={() => changePage('scan')}><ScanLine size={17}/>Escanear cômodo</button><button className="btn btn-outline" onClick={() => changePage('works')}><Plus size={17}/>Cadastro manual</button></div>}</div>
            <div className="room-list-header"><strong>Cômodos</strong><span>{home.rooms.length} cômodo(s)</span></div>
            <div className="room-chips">{home.rooms.map(r => <div key={r.id} className={`room-chip ${selectedRoomId === r.id ? 'selected' : ''}`}><button type="button" className="chip-main" aria-pressed={selectedRoomId === r.id} onClick={() => selectWall(r.id, selectedWall)}><Home size={17}/><span><strong>{r.name}</strong><small>{number(r.width)} × {number(r.length)} × {number(r.height)} m</small></span></button></div>)}</div>
            {home.rooms.some(r => r.id.startsWith('ex-')) && <p className="viewer-warning">Medidas e posições de exemplo. A distribuição real da casa dependerá das suas medidas; portas e janelas ainda não são modeladas.</p>}
          </section>
          </div>
          {selectedRoom && <section className="panel wall-preview" aria-label="Parede selecionada"><div className="wall-preview-heading"><div><span className="eyebrow dark-eyebrow">PAREDE SELECIONADA</span><h2>{selectedRoom.name} · {directionNames[selectedWall]}</h2><p>{number((selectedWall === 'norte' || selectedWall === 'sul' ? selectedRoom.width : selectedRoom.length) * selectedRoom.height)} m² estimados · {percentDone(selectedStages)}% concluído</p></div><button className="btn btn-primary" onClick={() => changePage('works')}><ArrowRight size={17}/>Ver em Obras</button></div><div className="wall-preview-selector" role="group" aria-label="Selecionar parede">{DIRECTIONS.map(d => <button type="button" key={d} aria-pressed={selectedWall === d} className={selectedWall === d ? 'active' : ''} onClick={() => selectWall(selectedRoomId, d)}>{directionNames[d]}</button>)}</div></section>}
        </>}

        {page === 'scan' && <GuidedRoomScan existingRooms={home.rooms} onComplete={completeRoomScan} onCancel={() => changePage('works')} />}
        {page === 'works' && <>
          <div className="page-title-row"><div><span className="eyebrow dark-eyebrow">ACOMPANHAMENTO</span><h1>Obras</h1><p>Registre o andamento de cada parede, sem precisar passar pela planta.</p></div><div className="scan-entry-actions"><button className="btn btn-primary" onClick={() => changePage('scan')}><ScanLine size={17}/>Escanear cômodo</button><button className="btn btn-outline" onClick={() => openRoom()}><Plus size={17}/>Adicionar cômodo</button></div></div>
          <div className="works-layout">
          <section className="panel inspector-panel"><div className="panel-heading inspector-heading"><div><h3>Acompanhamento da parede</h3><p>Registre o andamento e mantenha um histórico.</p></div><Hammer size={20} className="subtle-icon"/></div>
            {selectedRoom ? <><label className="field-label" htmlFor="work-room">Cômodo</label><select id="work-room" className="field-input" value={selectedRoomId} onChange={e => selectWall(e.target.value, selectedWall)}>{home.rooms.map(r => <option value={r.id} key={r.id}>{r.name}</option>)}</select>
              <span className="field-label wall-label" id="work-wall-label">Parede</span><div className="wall-tabs" role="group" aria-labelledby="work-wall-label">{DIRECTIONS.map(d => <button type="button" key={d} aria-pressed={selectedWall === d} className={selectedWall === d ? 'active' : ''} onClick={() => selectWall(selectedRoomId, d)}>{directionNames[d]}</button>)}</div>
              <div className="wall-metrics"><div><span>Área estimada</span><strong>{number((selectedWall === 'norte' || selectedWall === 'sul' ? selectedRoom.width : selectedRoom.length) * selectedRoom.height)} m²</strong></div><div><span>Etapas concluídas</span><strong>{percentDone(selectedStages)}%</strong></div></div>
              <div className="progress-track"><span style={{width: `${percentDone(selectedStages)}%`}}/></div>
              <form onSubmit={saveWork} className="work-form"><h4>Registrar atualização</h4><div className="form-row"><div className="field"><label htmlFor="stage">Etapa</label><select id="stage" value={stage} onChange={e => { const s = e.target.value as Stage; setStage(s); setStatus(selectedStages[s] ?? 'em-andamento'); }}>{STAGES.map(s => <option key={s}>{s}</option>)}</select></div><div className="field"><label htmlFor="step-status">Situação</label><select id="step-status" value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>{Object.entries(statusNames).map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select></div></div><div className="field"><label htmlFor="work-note">O que você fez? (opcional)</label><textarea id="work-note" rows={3} value={workNote} onChange={e => setWorkNote(e.target.value)} placeholder="Ex.: Removi a tinta descascada da metade superior da parede." /></div><button className="btn btn-primary full" type="submit"><Save size={17}/>Salvar atualização</button></form>
              <div className="stages-heading"><strong>Etapas da parede</strong><span>{STAGES.filter(s => selectedStages[s] === 'concluido').length} de {STAGES.length}</span></div>
              <div className="stage-list">{STAGES.map((item, i) => <button type="button" aria-pressed={stage === item} key={item} className={`stage-row ${stage === item ? 'selected-stage' : ''}`} onClick={() => { setStage(item); setStatus(selectedStages[item] ?? 'em-andamento'); }}><span className={`stage-indicator ${selectedStages[item] ?? 'nao-iniciado'}`}>{selectedStages[item] === 'concluido' ? <Check size={14}/> : i + 1}</span><span><strong>{item}</strong><small>{statusNames[selectedStages[item] ?? 'nao-iniciado']}</small></span>{stage === item && <ChevronRight size={16}/>}</button>)}</div>
              <div className="next-step"><Clock3 size={18}/><div><strong>Próxima etapa sugerida</strong><p>{next ? `${next} — ${statusNames[selectedStages[next] ?? 'nao-iniciado'].toLowerCase()}` : 'Todas as etapas foram concluídas.'}</p></div></div>
              {selectedWallLogs.length > 0 && <div className="wall-log"><strong>Últimas atualizações</strong>{selectedWallLogs.slice(0, 3).map(log => <div className="tiny-log" key={log.id}><span>{localDate(log.createdAt)}</span><strong>{log.stage} · {statusNames[log.status]}</strong>{log.note && <p>{log.note}</p>}</div>)}</div>}
            </> : <div className="empty"><Home size={30}/><strong>Selecione um cômodo</strong><span>Cadastre seu primeiro cômodo para acompanhar a reforma.</span></div>}
          </section>
          <section className="panel rooms-manager"><div className="panel-heading"><div><h3>Gerenciar cômodos</h3><p>Cadastre, ajuste medidas ou exclua cômodos da planta.</p></div><button className="btn btn-outline compact" onClick={() => openRoom()}><Plus size={17}/>Novo</button></div>
            <div className="rooms-manager-list">{home.rooms.map(r => <div key={r.id} className={`room-chip ${selectedRoomId === r.id ? 'selected' : ''}`}><button className="chip-main" onClick={() => selectWall(r.id, selectedWall)}><Home size={17}/><span><strong>{r.name}</strong><small>{number(r.width)} × {number(r.length)} × {number(r.height)} m</small></span></button><button className="icon-button" title={`Editar ${r.name}`} aria-label={`Editar ${r.name}`} onClick={() => openRoom(r)}><Edit3 size={15}/></button><button className="icon-button danger-hover" title={`Excluir ${r.name}`} aria-label={`Excluir ${r.name}`} onClick={() => deleteRoom(r)}><Trash2 size={15}/></button></div>)}</div>
            {home.rooms.length === 0 && <p className="rooms-empty">Nenhum cômodo cadastrado.</p>}
            <div className="rooms-manager-footer"><button className="link-button" onClick={() => changePage('floorplan')}><Box size={16}/>Visualizar Planta 3D <ArrowRight size={15}/></button></div>
          </section></div>
        </>}
        {page === 'history' && <><div className="page-title-row"><div><span className="eyebrow dark-eyebrow">RASTREABILIDADE</span><h1>Histórico de atividades</h1><p>O que foi feito, onde foi feito e quando aconteceu.</p></div><button className="btn btn-outline" onClick={exportBackup}><ArrowDownToLine size={17}/>Exportar dados</button></div>
          <section className="panel history-panel">{home.logs.length === 0 ? <div className="empty"><ClipboardList size={38}/><strong>O histórico ainda está vazio</strong><span>Abra Obras, escolha uma parede e registre a primeira atualização.</span><button className="btn btn-primary" onClick={() => changePage('works')}><Hammer size={17}/>Registrar obra</button></div> : <div className="timeline">{home.logs.map(log => <article className="timeline-row" key={log.id}><span className="timeline-icon"><Hammer size={17}/></span><div><span className="timeline-date">{localDate(log.createdAt)}</span><h3>{log.stage} · {statusNames[log.status]}</h3><p><strong>{home.rooms.find(r => r.id === log.roomId)?.name ?? 'Cômodo excluído'}</strong> — Parede {directionNames[log.direction].toLowerCase()}</p>{log.note && <div className="timeline-note">{log.note}</div>}</div></article>)}</div>}</section>
          <div className="history-footer"><span>Seus dados são sincronizados com sua conta Supabase. O backup JSON continua disponível.</span><button className="link-button danger-link" onClick={clearAll}><RotateCcw size={16}/>Zerar projeto</button></div>
        </>}
      </div>
    </main>
    {purchaseOpen && <Modal title={editingPurchaseId ? 'Editar item de compra' : 'Adicionar à lista de compras'} onClose={() => setPurchaseOpen(false)}><form onSubmit={savePurchase} className="modal-form">
      <div className="field"><label htmlFor="p-name">Nome do item *</label><input id="p-name" required autoFocus placeholder="Ex.: Jogo de panelas, tinta, geladeira..." value={purchaseDraft.name} onChange={e => setPurchaseDraft(p => ({...p, name: e.target.value}))}/></div>
      <div className="form-row"><div className="field"><label htmlFor="p-category">Categoria (livre) *</label><input id="p-category" required list="category-suggestions" value={purchaseDraft.category} onChange={e => setPurchaseDraft(p => ({...p, category: e.target.value}))}/><datalist id="category-suggestions">{['Eletrodomésticos','Cozinha','Utensílios','Móveis','Pintura','Ferramentas','Elétrica','Hidráulica','Limpeza','Decoração','Outros',...categories].map((c,i) => <option key={`${i}-${c}`} value={c}/>)}</datalist></div>
        <div className="field"><label htmlFor="p-room">Cômodo</label><select id="p-room" value={purchaseDraft.roomId} onChange={e => setPurchaseDraft(p => ({...p, roomId: e.target.value}))}><option value="">Não vinculado</option>{home.rooms.map(r => <option value={r.id} key={r.id}>{r.name}</option>)}</select></div></div>
      <div className="form-row three"><div className="field"><label htmlFor="p-priority">Prioridade</label><select id="p-priority" value={purchaseDraft.priority} onChange={e => setPurchaseDraft(p => ({...p, priority: e.target.value as Priority}))}>{Object.entries(priorityNames).map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select></div>
        <div className="field"><label htmlFor="p-qty">Quantidade</label><input id="p-qty" type="number" min="0.01" step="any" required value={moneyInput(purchaseDraft.quantity)} onChange={e => setPurchaseDraft(p => ({...p, quantity: Number(e.target.value)}))}/></div>
        <div className="field"><label htmlFor="p-price">Preço unitário (R$)</label><input id="p-price" type="number" min="0" step="0.01" value={moneyInput(purchaseDraft.unitPrice)} onChange={e => setPurchaseDraft(p => ({...p, unitPrice: Number(e.target.value)}))}/></div></div>
      <div className="field"><label htmlFor="p-url">Link de referência (opcional)</label><input id="p-url" type="url" placeholder="https://..." value={purchaseDraft.url} onChange={e => setPurchaseDraft(p => ({...p, url: e.target.value}))}/></div>
      <div className="field"><label htmlFor="p-notes">Observações</label><textarea id="p-notes" rows={3} placeholder="Marca, cor, tamanho ou informações importantes" value={purchaseDraft.notes} onChange={e => setPurchaseDraft(p => ({...p, notes: e.target.value}))}/></div>
      <label className="checkbox-line"><input type="checkbox" checked={purchaseDraft.purchased} onChange={e => setPurchaseDraft(p => ({...p, purchased: e.target.checked}))}/>Item já comprado</label>
      <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setPurchaseOpen(false)}>Cancelar</button><button type="submit" className="btn btn-primary"><Check size={17}/>Salvar item</button></div>
    </form></Modal>}
    {roomOpen && <Modal title={editingRoomId ? 'Editar cômodo' : 'Adicionar cômodo'} onClose={() => setRoomOpen(false)}><form className="modal-form" onSubmit={saveRoom}><div className="field"><label htmlFor="r-name">Nome do cômodo *</label><input autoFocus id="r-name" required placeholder="Ex.: Quarto principal, cozinha, banheiro" value={roomDraft.name} onChange={e => setRoomDraft(p => ({...p, name: e.target.value}))}/></div>
      <p className="form-hint">Informe as medidas em metros. A posição X/Z determina onde o cômodo aparece no modelo da casa.</p>
      <div className="form-row three">{([['width','Largura (m)'],['length','Comprimento (m)'],['height','Altura (m)']] as const).map(([key,label]) => <div className="field" key={key}><label htmlFor={`r-${key}`}>{label}</label><input id={`r-${key}`} type="number" min="0.1" max="100" step="0.01" required value={roomDraft[key]} onChange={e => setRoomDraft(p => ({...p, [key]: Number(e.target.value)}))}/></div>)}</div>
      <div className="form-row">{([['x','Posição X (m)'],['z','Posição Z (m)']] as const).map(([key,label]) => <div className="field" key={key}><label htmlFor={`r-${key}`}>{label}</label><input id={`r-${key}`} type="number" min="-100" max="100" step="0.01" required value={roomDraft[key]} onChange={e => setRoomDraft(p => ({...p, [key]: Number(e.target.value)}))}/></div>)}</div>
      <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setRoomOpen(false)}>Cancelar</button><button type="submit" className="btn btn-primary"><Check size={17}/>Salvar cômodo</button></div>
    </form></Modal>}
  </div>;
}
export default App;
