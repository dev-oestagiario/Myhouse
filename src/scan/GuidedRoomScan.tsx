import {DeferredView} from '../shared/DeferredView';
import {Feedback} from '../shared/UiState';
import { useBackLayer } from '../shared/useBackLayer';
import { lazy, useEffect, useRef, useState } from 'react';
import type { PlanarScan } from './planarGeometry';
import { ArrowLeft, ArrowRight, Camera as CameraIcon, CheckCircle2, Layers3, Ruler, ShieldCheck, ScanLine } from 'lucide-react';
import type { Room } from '../types';
import { makeDefaultScanDraft, verifyScanDraft, type RoomScanDraft } from './roomScan';
import { applyArMeasurement, getArSupport, requestArMeasurement, type ArMeasurements, type ArSupport } from './arcore';
import { chooseLiveScanMode, describeLiveScanMode } from './liveScan';
const LiveCameraPreview=lazy(()=>import('./LiveCameraPreview'));
const RoomScanPreview=lazy(()=>import('./RoomScanPreview'));
import FloorOverview from './FloorOverview';
import { dimensionDifference, getScanReviewMetrics, resizeScanDraft } from './scanReview';
type Screen = 'welcome' | 'live' | 'measures' | 'review';
type Props = {
  existingRooms: Room[];
  onComplete: (room: RoomScanDraft) => void;
  onCancel: () => void;
};


export default function GuidedRoomScan({ existingRooms, onComplete, onCancel }: Props) {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [draft, setDraft] = useState<RoomScanDraft>(() => makeDefaultScanDraft(existingRooms));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [arSupport, setArSupport] = useState<ArSupport | null>(null);
  const [arMeasurement, setArMeasurement] = useState<ArMeasurements | null>(null);
  const [estimated, setEstimated] = useState<{width:number;length:number}|null>(null);
  const [lastInput, setLastInput] = useState<'live' | 'manual' | 'arcore'>('manual');
  const heading = useRef<HTMLHeadingElement>(null);
  const scanMode = chooseLiveScanMode(arSupport);
  const metrics = getScanReviewMetrics(draft);
  const widthDiff=estimated ? dimensionDifference(estimated.width,draft.width) : 0;
  const lengthDiff=estimated ? dimensionDifference(estimated.length,draft.length) : 0;

  useEffect(() => { heading.current?.focus(); }, [screen]);
  useEffect(() => {
    let mounted = true;
    void getArSupport().then(value => { if (mounted) setArSupport(value); });
    return () => { mounted = false; };
  }, []);

  function useManual() {
    setDraft(previous => ({ ...previous, footprint: undefined }));
    setEstimated(null);
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

  function acceptPlan(plan: PlanarScan) {
    // Mostra centímetros, não dezenas de casas decimais de uma projeção aproximada.
    // O contorno é redimensionado junto para manter a caixa delimitadora válida.
    const width = Math.max(0.1, Math.round(plan.width * 100) / 100);
    const length = Math.max(0.1, Math.round(plan.length * 100) / 100);
    const footprint = plan.footprint.map(p => ({
      x: p.x * width / plan.width,
      z: p.z * length / plan.length,
    }));
    setDraft(previous => ({ ...previous, width, length, footprint }));
    setEstimated({width,length});
    setArMeasurement(null);
    setLastInput('live');
    setConfirmed(false);
    setMessage('');
    setScreen('measures');
  }

  function updateDimension(key: 'width'|'length'|'height', value: number) {
    setDraft(previous => resizeScanDraft(previous,key,value));
    setConfirmed(false);
  }

  async function measureWithAr() {
    setMessage('');
    setBusy(true);
    try {
      const result = await requestArMeasurement();
      setDraft(previous => ({ ...applyArMeasurement(previous, result), footprint: undefined }));
      setArMeasurement(result);
      setEstimated({width:result.width,length:result.length});
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

  function backStep(){
    if(busy)return;
    setMessage('');
    setConfirmed(false);
    if(screen==='review')setScreen('measures');
    else if(screen==='measures')setScreen(lastInput==='live'?'live':'welcome');
    else if(screen==='live')setScreen('welcome');
    else onCancel();
  }
  useBackLayer(true,35,backStep);
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
          screen === 'live' ? 'Desenhe o contorno do piso' :
          screen === 'measures' ? 'Confira as medidas' : 'Revise sua planta 3D'
        }</h1>
        <p>A câmera funciona em tempo real. Sem ARCore, uma referência de escala e pontos sobre o piso permitem estimar seu contorno.</p>
      </div>
      <button type="button" className="btn btn-ghost scan-back" onClick={backStep} aria-label={screen==='welcome'?'Voltar para Obras':'Voltar uma etapa'} disabled={busy}><ArrowLeft size={17}/>Voltar</button>
    </div>
    <ol className="scan-steps" aria-label="Etapas do escaneamento">
      {steps.map((item, index) => <li key={item.key} aria-current={screen === item.key ? 'step' : undefined} className={screen === item.key ? 'active' : ''}><span>{index + 1}</span>{item.label}</li>)}
    </ol>
    {screen === 'welcome' && <div className="scan-card">
      <div className="scan-icon"><ScanLine size={27}/></div>
      <h2>Explore o espaço em tempo real</h2>
      <p>O aplicativo verifica o suporte ao ARCore. Se disponível, abre a medição nativa; nos demais aparelhos, marque o contorno do piso com a câmera ao vivo e uma referência de tamanho conhecido.</p>
      <div className="scan-mode-status" role="status"><CameraIcon size={18}/><span>{describeLiveScanMode(scanMode)}</span></div>
      <div className="scan-privacy"><ShieldCheck size={19}/><span>O vídeo não será gravado nem enviado para a nuvem. Apenas o cômodo confirmado por você será salvo.</span></div>
      <div className="scan-actions">
        <button className="btn btn-primary" type="button" disabled={busy || scanMode === 'checking'} onClick={startLiveScan}><ScanLine size={18}/>{busy ? 'Abrindo câmera…' : 'Iniciar escaneamento'}</button>
        <button className="btn btn-outline" type="button" disabled={busy} onClick={useManual}><Ruler size={18}/>Usar modo manual</button>
      </div>
      <p className="scan-hint">A câmera comum não determina distâncias sozinha. A estimativa depende de uma referência medida, todos os pontos no mesmo piso e o aparelho imóvel.</p>
    </div>}
    {screen === 'live' && <div className="scan-card">
      <h2>Reconstrução plana assistida</h2>
      <p>Mostre todo o contorno do piso, mantenha o celular parado e marque uma referência de escala. Os pontos são projetados em uma planta 2D aproximada, sem fotos ou vídeo gravado.</p>
      <DeferredView title="Carregando câmera…" onBack={useManual} backLabel="Usar modo manual"><LiveCameraPreview onContinue={acceptPlan} onManual={useManual}/></DeferredView>
      <div className="scan-footer"><button className="btn btn-ghost" type="button" onClick={() => setScreen('welcome')}><ArrowLeft size={16}/>Voltar</button></div>
    </div>}
    {screen === 'measures' && <div className="scan-card">
      <div className="scan-icon"><Ruler size={27}/></div>
      <h2>Medidas do cômodo</h2>
      <p>Confira as medidas com uma trena. No ARCore são estimativas por pontos rastreados. Na câmera comum, elas são estimadas a partir de um retângulo calibrado no piso e dos cantos que você marcou.</p>
      {arSupport?.supported && <div className="scan-ar-option"><button type="button" className="btn btn-outline" disabled={busy} onClick={() => void measureWithAr()}><Ruler size={17}/>{busy ? 'Abrindo ARCore…' : 'Medir largura e comprimento com ARCore'}</button><small>Marque dois pontos do piso para cada dimensão. A altura continua manual.</small></div>}
      {arMeasurement && <p className="scan-ar-result" role="status"><CheckCircle2 size={17}/>O ARCore estimou {arMeasurement.width.toFixed(2)} m de largura e {arMeasurement.length.toFixed(2)} m de comprimento. {arMeasurement.depthUsed ? 'Houve uso de profundidade, sujeita a mais variação.' : 'Foram usadas referências de superfície detectadas.'} Corrija qualquer diferença abaixo antes de salvar.</p>}
      <div className="scan-fields">
        <label className="scan-field scan-wide">Nome do cômodo<input required maxLength={80} value={draft.name} placeholder="Ex.: Quarto principal" onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} /></label>
        {([['width','Largura (m)'],['length','Comprimento (m)'],['height','Altura (m)']] as const).map(([key,label]) =>
          <label className="scan-field" key={key}>{label}<input required type="number" inputMode="decimal" min="0.1" max="100" step="0.01" value={draft[key]} onChange={e => updateDimension(key, Number(e.target.value))} /></label>)}
        <p className="scan-field-note scan-wide">A posição determina onde o cômodo ficará em relação aos outros. Se não souber, mantenha a posição sugerida e ajuste depois em Obras.</p>
        {([['x','Posição X (m)'],['z','Posição Z (m)']] as const).map(([key,label]) =>
          <label className="scan-field" key={key}>{label}<input required type="number" inputMode="decimal" min="-100" max="100" step="0.01" value={draft[key]} onChange={e => { const v = Number(e.target.value); setDraft(p => ({ ...p, [key]: v })); setConfirmed(false); }} /></label>)}
      </div>
      {draft.footprint && <FloorOverview draft={draft}/>}
      {estimated && Math.max(widthDiff,lengthDiff)>=5 && <p className="scan-measurement-warning" role="status">Você corrigiu a estimativa inicial em até {Math.max(widthDiff,lengthDiff).toFixed(1)}%. O contorno foi atualizado proporcionalmente. Confira se o formato ainda corresponde ao ambiente.</p>}
      <div className="scan-footer"><button className="btn btn-ghost" type="button" onClick={() => { setMessage(''); setScreen(lastInput === 'live' ? 'live' : 'welcome'); }}><ArrowLeft size={16}/>Voltar</button><button className="btn btn-primary" type="button" onClick={reviewMeasures}>Visualizar em 3D<ArrowRight size={16}/></button></div>
    </div>}
    {screen === 'review' && <div className="scan-card">
      <h2>{draft.name.trim()}</h2>
      <p>Representação simplificada do contorno do piso e altura informada, sem portas ou janelas. Arraste para girar. {arMeasurement && 'Se você usou ARCore, os valores são aproximados e podem ser corrigidos antes do salvamento.'}</p>
      <DeferredView title="Carregando prévia 3D…" onBack={()=>setScreen('measures')} backLabel="Corrigir medidas"><RoomScanPreview draft={draft}/></DeferredView>
      <FloorOverview draft={draft}/>
      <div className="scan-summary"><div><span>Largura</span><strong>{draft.width} m</strong></div><div><span>Comprimento</span><strong>{draft.length} m</strong></div><div><span>Altura</span><strong>{draft.height} m</strong></div><div><span>Área de piso</span><strong>{metrics.area.toFixed(2)} m²</strong></div><div><span>Perímetro</span><strong>{metrics.perimeter.toFixed(2)} m</strong></div><div><span>Cantos</span><strong>{metrics.vertices}</strong></div></div>
      <p className="scan-final-warning">Fonte: {lastInput === 'live' ? 'contorno de piso marcado na câmera, com escala calibrada' : lastInput === 'arcore' ? 'medidas estimadas com ARCore' : 'valores informados manualmente'}. Verifique as dimensões reais e o contorno. As imagens não serão salvas.</p>
      <label className="scan-confirm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/><span>Conferi as medidas de largura, comprimento, altura, posição e formato do cômodo. Sei que a planta é ilustrativa e que posso ajustar a geometria depois.</span></label>
      <div className="scan-footer"><button type="button" className="btn btn-ghost" onClick={() => { setConfirmed(false); setMessage(''); setScreen('measures'); }}><ArrowLeft size={16}/>Corrigir medidas</button><button type="button" disabled={!confirmed} className="btn btn-primary" onClick={save}><CheckCircle2 size={17}/>Criar cômodo na Planta 3D</button></div>
    </div>}
    {message && <Feedback tone="error">{message}</Feedback>}
    <p className="scan-bottom-note"><Layers3 size={16}/> A transmissão da câmera não é salva; apenas o cômodo confirmado será sincronizado.</p>
  </section>;
}
