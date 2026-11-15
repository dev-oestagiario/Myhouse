import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Edges, OrbitControls } from '@react-three/drei';
import { ArrowLeft, ArrowRight, Camera as CameraIcon, CheckCircle2, Layers3, Ruler, ShieldCheck, ScanLine } from 'lucide-react';
import type { Room } from '../types';
import { makeDefaultScanDraft, verifyScanDraft, type RoomScanDraft } from './roomScan';
import { applyArMeasurement, getArSupport, requestArMeasurement, type ArMeasurements, type ArSupport } from './arcore';
import { chooseLiveScanMode, describeLiveScanMode } from './liveScan';
import LiveCameraPreview from './LiveCameraPreview';
type Screen = 'welcome' | 'live' | 'measures' | 'review';
type Props = {
  existingRooms: Room[];
  onComplete: (room: RoomScanDraft) => void;
  onCancel: () => void;
};

function RoomScanPreview({ draft }: { draft: RoomScanDraft }) {
  const w = draft.width;
  const l = draft.length;
  const h = draft.height;
  const radius = Math.max(w, l, h);
  return <div className="scan-3d" role="img" aria-label={'Prévia 3D simplificada de ' + w + ' por ' + l + ' por ' + h + ' metros'}>
    <Canvas camera={{ position: [w * 1.4, h * 2, l * 1.65], fov: 45 }} dpr={[1, 1.5]}>
      <color attach="background" args={['#f5f8f5']} />
      <ambientLight intensity={1.4} />
      <directionalLight position={[6, 9, 7]} intensity={1.6} />
      <mesh position={[0, -0.04, 0]}>
        <boxGeometry args={[w, 0.08, l]} />
        <meshStandardMaterial color="#dcece2" />
        <Edges color="#7fa995" />
      </mesh>
      {[
        { position: [0, h / 2, -l / 2] as [number,number,number], size: [w, h, 0.06] as [number,number,number] },
        { position: [0, h / 2, l / 2] as [number,number,number], size: [w, h, 0.06] as [number,number,number] },
        { position: [-w / 2, h / 2, 0] as [number,number,number], size: [0.06, h, l] as [number,number,number] },
        { position: [w / 2, h / 2, 0] as [number,number,number], size: [0.06, h, l] as [number,number,number] },
      ].map((wall, i) => <mesh key={i} position={wall.position}>
        <boxGeometry args={wall.size} />
        <meshStandardMaterial color="#8cb6a1" transparent opacity={0.26} depthWrite={false}/>
        <Edges color="#63917d" />
      </mesh>)}
      <OrbitControls target={[0, h / 2, 0]} enablePan={false} minDistance={Math.max(1.5, radius)} maxDistance={Math.max(15, radius * 5)} maxPolarAngle={Math.PI / 2.05}/>
    </Canvas>
  </div>;
}

export default function GuidedRoomScan({ existingRooms, onComplete, onCancel }: Props) {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [draft, setDraft] = useState<RoomScanDraft>(() => makeDefaultScanDraft(existingRooms));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [arSupport, setArSupport] = useState<ArSupport | null>(null);
  const [arMeasurement, setArMeasurement] = useState<ArMeasurements | null>(null);
  const [lastInput, setLastInput] = useState<'live' | 'manual' | 'arcore'>('manual');
  const heading = useRef<HTMLHeadingElement>(null);
  const scanMode = chooseLiveScanMode(arSupport);

  useEffect(() => { heading.current?.focus(); }, [screen]);
  useEffect(() => {
    let mounted = true;
    void getArSupport().then(value => { if (mounted) setArSupport(value); });
    return () => { mounted = false; };
  }, []);

  function useManual() {
    setLastInput('manual');
    setArMeasurement(null);
    setConfirmed(false);
    setMessage('');
    setScreen('measures');
  }

  function startLiveScan() {
    setMessage('');
    if (scanMode === 'checking') return;
    if (scanMode === 'arcore') {
      void measureWithAr();
      return;
    }
    setLastInput('live');
    setArMeasurement(null);
    setConfirmed(false);
    setScreen('live');
  }

  async function measureWithAr() {
    setMessage('');
    setBusy(true);
    try {
      const result = await requestArMeasurement();
      setDraft(previous => applyArMeasurement(previous, result));
      setArMeasurement(result);
      setLastInput('arcore');
      setConfirmed(false);
      setScreen('measures');
      setMessage('');
    } catch (problem) {
      const text = problem instanceof Error ? problem.message : String(problem);
      if (!/AR_CANCELLED|cancelad/i.test(text)) {
        setMessage('Não foi possível medir com ARCore. Você pode continuar preenchendo as medidas manualmente.');
      }
    } finally {
      setBusy(false);
    }
  }

  function reviewMeasures() {
    try {
      verifyScanDraft(draft);
      setMessage('');
      setScreen('review');
    } catch (problem) {
      setMessage(problem instanceof Error ? problem.message : 'Confira os valores informados.');
    }
  }

  function save() {
    if (!confirmed) { setMessage('Confirme que você verificou as medidas antes de salvar.'); return; }
    try {
      onComplete(verifyScanDraft(draft));
    } catch (problem) {
      setMessage(problem instanceof Error ? problem.message : 'Não foi possível salvar o cômodo.');
    }
  }

  const steps = [
    { key: 'welcome', label: 'Início' },
    { key: 'live', label: 'Ao vivo' },
    { key: 'measures', label: 'Medidas' },
    { key: 'review', label: 'Prévia' },
  ] as const;

  return <section className="scan-wizard" aria-label="Escaneamento ao vivo de cômodo">
    <div className="scan-header">
      <div>
        <span className="eyebrow dark-eyebrow">ESCANEAMENTO AO VIVO</span>
        <h1 ref={heading} tabIndex={-1}>{
          screen === 'welcome' ? 'Mapeie seu cômodo com a câmera' :
          screen === 'live' ? 'Mostre o ambiente ao vivo' :
          screen === 'measures' ? 'Confira as medidas' : 'Revise sua planta 3D'
        }</h1>
        <p>A câmera funciona em tempo real. No ARCore, selecione referências no piso; sem ARCore, a reconstrução automática começará na próxima etapa.</p>
      </div>
      <button type="button" className="btn btn-ghost scan-back" onClick={onCancel} aria-label="Voltar para Obras"><ArrowLeft size={17}/>Voltar</button>
    </div>
    <ol className="scan-steps" aria-label="Etapas do escaneamento">
      {steps.map((item, index) => <li key={item.key} aria-current={screen === item.key ? 'step' : undefined} className={screen === item.key ? 'active' : ''}><span>{index + 1}</span>{item.label}</li>)}
    </ol>
    {screen === 'welcome' && <div className="scan-card">
      <div className="scan-icon"><ScanLine size={27}/></div>
      <h2>Explore o espaço em tempo real</h2>
      <p>O aplicativo verifica automaticamente o suporte a ARCore. Se disponível, abrirá a câmera nativa para medir pontos do piso. Caso contrário, abrirá a visualização contínua da câmera, sem fotografias.</p>
      <div className="scan-mode-status" role="status"><CameraIcon size={18}/><span>{describeLiveScanMode(scanMode)}</span></div>
      <div className="scan-privacy"><ShieldCheck size={19}/><span>O vídeo não será gravado nem enviado para a nuvem. Apenas o cômodo confirmado por você será salvo.</span></div>
      <div className="scan-actions">
        <button className="btn btn-primary" type="button" disabled={busy || scanMode === 'checking'} onClick={startLiveScan}><ScanLine size={18}/>{busy ? 'Abrindo câmera…' : 'Iniciar escaneamento'}</button>
        <button className="btn btn-outline" type="button" disabled={busy} onClick={useManual}><Ruler size={18}/>Usar modo manual</button>
      </div>
      <p className="scan-hint">Nesta etapa, a câmera ao vivo sem ARCore ainda não calcula dimensões. As medidas continuarão editáveis nos dois modos.</p>
    </div>}
    {screen === 'live' && <div className="scan-card">
      <h2>Visualização contínua do cômodo</h2>
      <p>Aponte o aparelho para o ambiente. Não há captura de fotos. A análise geométrica para aparelhos sem ARCore será integrada na etapa 2.</p>
      <LiveCameraPreview onContinue={() => { setLastInput('live'); setScreen('measures'); }} onManual={useManual}/>
      <div className="scan-footer"><button className="btn btn-ghost" type="button" onClick={() => setScreen('welcome')}><ArrowLeft size={16}/>Voltar</button></div>
    </div>}
    {screen === 'measures' && <div className="scan-card">
      <div className="scan-icon"><Ruler size={27}/></div>
      <h2>Medidas do cômodo</h2>
      <p>Confira as medidas com uma trena. No ARCore, largura e comprimento são estimativas; na câmera comum, ainda não há cálculo automático nesta etapa.</p>
      {arSupport?.supported && <div className="scan-ar-option"><button type="button" className="btn btn-outline" disabled={busy} onClick={() => void measureWithAr()}><Ruler size={17}/>{busy ? 'Abrindo ARCore…' : 'Medir largura e comprimento com ARCore'}</button><small>Marque dois pontos do piso para cada dimensão. A altura continua manual.</small></div>}
      {arMeasurement && <p className="scan-ar-result" role="status"><CheckCircle2 size={17}/>O ARCore estimou {arMeasurement.width.toFixed(2)} m de largura e {arMeasurement.length.toFixed(2)} m de comprimento. {arMeasurement.depthUsed ? 'Houve uso de profundidade, sujeita a mais variação.' : 'Foram usadas referências de superfície detectadas.'} Corrija qualquer diferença abaixo antes de salvar.</p>}
      <div className="scan-fields">
        <label className="scan-field scan-wide">Nome do cômodo<input required maxLength={80} value={draft.name} placeholder="Ex.: Quarto principal" onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} /></label>
        {([['width','Largura (m)'],['length','Comprimento (m)'],['height','Altura (m)']] as const).map(([key,label]) =>
          <label className="scan-field" key={key}>{label}<input required type="number" inputMode="decimal" min="0.1" max="100" step="0.01" value={draft[key]} onChange={e => { const v = Number(e.target.value); setDraft(p => ({ ...p, [key]: v })); setConfirmed(false); }} /></label>)}
        <p className="scan-field-note scan-wide">A posição determina onde o cômodo ficará em relação aos outros. Se não souber, mantenha a posição sugerida e ajuste depois em Obras.</p>
        {([['x','Posição X (m)'],['z','Posição Z (m)']] as const).map(([key,label]) =>
          <label className="scan-field" key={key}>{label}<input required type="number" inputMode="decimal" min="-100" max="100" step="0.01" value={draft[key]} onChange={e => { const v = Number(e.target.value); setDraft(p => ({ ...p, [key]: v })); setConfirmed(false); }} /></label>)}
      </div>
      <div className="scan-footer"><button className="btn btn-ghost" type="button" onClick={() => { setMessage(''); setScreen(lastInput === 'live' ? 'live' : 'welcome'); }}><ArrowLeft size={16}/>Voltar</button><button className="btn btn-primary" type="button" onClick={reviewMeasures}>Visualizar em 3D<ArrowRight size={16}/></button></div>
    </div>}
    {screen === 'review' && <div className="scan-card">
      <h2>{draft.name.trim()}</h2>
      <p>Representação simplificada das medidas conferidas, sem portas ou janelas. Arraste para girar. {arMeasurement && 'Se você usou ARCore, os valores são aproximados e podem ser corrigidos antes do salvamento.'}</p>
      <RoomScanPreview draft={draft}/>
      <div className="scan-summary"><div><span>Largura</span><strong>{draft.width} m</strong></div><div><span>Comprimento</span><strong>{draft.length} m</strong></div><div><span>Altura</span><strong>{draft.height} m</strong></div></div>
      <label className="scan-confirm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/><span>Conferi as medidas, incluindo qualquer estimativa ARCore, e entendo que esta planta é ilustrativa, não um levantamento técnico.</span></label>
      <div className="scan-footer"><button type="button" className="btn btn-ghost" onClick={() => { setConfirmed(false); setMessage(''); setScreen('measures'); }}><ArrowLeft size={16}/>Corrigir medidas</button><button type="button" disabled={!confirmed} className="btn btn-primary" onClick={save}><CheckCircle2 size={17}/>Criar cômodo na Planta 3D</button></div>
    </div>}
    {message && <p role="alert" className="scan-error">{message}</p>}
    <p className="scan-bottom-note"><Layers3 size={16}/> A transmissão da câmera não é salva; apenas o cômodo confirmado será sincronizado.</p>
  </section>;
}
