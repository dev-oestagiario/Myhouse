import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Canvas } from '@react-three/fiber';
import { Edges, OrbitControls } from '@react-three/drei';
import { ArrowLeft, ArrowRight, Camera as CameraIcon, CheckCircle2, ImagePlus, Layers3, Ruler, ShieldCheck, Trash2 } from 'lucide-react';
import type { Room } from '../types';
import { PHOTO_GUIDES, makeDefaultScanDraft, verifyScanDraft, type PhotoGuideId, type RoomScanDraft } from './roomScan';

type Screen = 'welcome' | 'photos' | 'measures' | 'review';
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
  const [shotIndex, setShotIndex] = useState(0);
  const [photos, setPhotos] = useState<Partial<Record<PhotoGuideId, string>>>({});
  const [draft, setDraft] = useState<RoomScanDraft>(() => makeDefaultScanDraft(existingRooms));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const captureInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<Partial<Record<PhotoGuideId, string>>>({});
  const currentPhoto = PHOTO_GUIDES[shotIndex];
  const isNative = Capacitor.getPlatform() !== 'web';
  const count = Object.values(photos).filter(Boolean).length;

  useEffect(() => { heading.current?.focus(); }, [screen, shotIndex]);
  useEffect(() => {
    const urls = objectUrls.current;
    return () => { Object.values(urls).forEach(url => { if (url) URL.revokeObjectURL(url); }); };
  }, []);

  function replacePhoto(id: PhotoGuideId, url: string, owned: boolean) {
    if (objectUrls.current[id]) URL.revokeObjectURL(objectUrls.current[id]);
    if (owned) objectUrls.current[id] = url;
    else delete objectUrls.current[id];
    setPhotos(prev => ({ ...prev, [id]: url }));
    setMessage('');
  }

  function removePhoto() {
    const id = currentPhoto.id;
    const url = objectUrls.current[id];
    if (url) URL.revokeObjectURL(url);
    delete objectUrls.current[id];
    setPhotos(prev => { const next = { ...prev }; delete next[id]; return next; });
    setMessage('');
  }

  async function takePhoto() {
    setMessage('');
    if (!isNative) { captureInput.current?.click(); return; }
    setBusy(true);
    try {
      const result = await Camera.getPhoto({
        source: CameraSource.Camera,
        resultType: CameraResultType.Uri,
        allowEditing: false,
        saveToGallery: false,
        quality: 72,
        correctOrientation: true,
      });
      if (result.webPath) replacePhoto(currentPhoto.id, result.webPath, false);
      else setMessage('A câmera não retornou uma foto. Tente novamente ou escolha uma imagem.');
    } catch (problem) {
      const error = problem instanceof Error ? problem.message : String(problem);
      if (!/cancel/i.test(error)) setMessage('Não foi possível abrir a câmera. Você pode escolher uma foto ou continuar sem capturar.');
    } finally { setBusy(false); }
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
      setMessage('Escolha uma imagem de até 10 MB.'); return;
    }
    replacePhoto(currentPhoto.id, URL.createObjectURL(file), true);
  }

  function nextCapture() {
    setMessage('');
    if (shotIndex < PHOTO_GUIDES.length - 1) setShotIndex(i => i + 1);
    else setScreen('measures');
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
    { key: 'photos', label: 'Captura' },
    { key: 'measures', label: 'Medidas' },
    { key: 'review', label: 'Prévia' },
  ] as const;

  return <section className="scan-wizard" aria-label="Escaneamento assistido de cômodo">
    <div className="scan-header">
      <div><span className="eyebrow dark-eyebrow">ESCANEAMENTO ASSISTIDO</span><h1 ref={heading} tabIndex={-1}>{
        screen === 'welcome' ? 'Criar cômodo pela câmera' :
        screen === 'photos' ? 'Fotografe o ambiente' :
        screen === 'measures' ? 'Confira as medidas' : 'Revise sua planta 3D'
      }</h1><p>As fotos ajudam a registrar o ambiente. Nesta primeira versão, as medidas são informadas por você.</p></div>
      <button type="button" className="btn btn-outline" onClick={onCancel}>Sair</button>
    </div>
    <ol className="scan-steps" aria-label="Etapas do escaneamento">
      {steps.map((item, index) => <li key={item.key} aria-current={screen === item.key ? 'step' : undefined} className={screen === item.key ? 'active' : ''}><span>{index + 1}</span>{item.label}</li>)}
    </ol>
    {screen === 'welcome' && <div className="scan-card">
      <div className="scan-icon"><CameraIcon size={27}/></div>
      <h2>Registre o seu espaço</h2>
      <p>Você será orientado a fotografar quatro lados e o teto. Use uma trena para conferir a largura, o comprimento e a altura. Fotos e medições não são automáticas nesta fase.</p>
      <div className="scan-privacy"><ShieldCheck size={20}/><span>As fotos ficam temporariamente neste aparelho enquanto você usa o assistente. Elas não são enviadas ao Supabase nem incluídas no backup. Evite fotografar pessoas e documentos.</span></div>
      <div className="scan-actions"><button className="btn btn-primary" type="button" onClick={() => setScreen('photos')}><CameraIcon size={18}/>Começar a captura</button><button className="btn btn-outline" type="button" onClick={() => setScreen('measures')}><Ruler size={18}/>Continuar sem câmera</button></div>
      <p className="scan-hint">Medição automática com ARCore será uma melhoria futura para aparelhos compatíveis. A câmera comum não fornece medidas confiáveis sozinha.</p>
    </div>}
    {screen === 'photos' && <div className="scan-card">
      <p className="scan-kicker">VISTA {shotIndex + 1} DE {PHOTO_GUIDES.length} · {count} foto(s) capturada(s)</p>
      <h2>{currentPhoto.title}</h2><p>{currentPhoto.description}</p>
      <div className="scan-photo-preview">
        {photos[currentPhoto.id] ? <img src={photos[currentPhoto.id]} alt={'Foto capturada: ' + currentPhoto.title} /> : <div className="scan-photo-placeholder"><CameraIcon size={37}/><strong>Nenhuma foto capturada</strong><span>Enquadre o cômodo. Você pode pular esta etapa.</span></div>}
      </div>
      <input ref={captureInput} type="file" className="visually-hidden" accept="image/*" capture="environment" tabIndex={-1} aria-hidden="true" onChange={chooseFile}/>
      <input ref={galleryInput} type="file" className="visually-hidden" accept="image/*" tabIndex={-1} aria-hidden="true" onChange={chooseFile}/>
      <div className="scan-photo-actions">
        <button className="btn btn-primary" type="button" onClick={() => void takePhoto()} disabled={busy}><CameraIcon size={17}/>{busy ? 'Abrindo câmera…' : photos[currentPhoto.id] ? 'Tirar outra foto' : 'Tirar foto'}</button>
        <button className="btn btn-outline" type="button" onClick={() => galleryInput.current?.click()} disabled={busy}><ImagePlus size={17}/>Escolher imagem</button>
        {photos[currentPhoto.id] && <button className="btn btn-ghost" type="button" onClick={removePhoto} disabled={busy}><Trash2 size={17}/>Descartar</button>}
      </div>
      <div className="scan-footer"><button className="btn btn-ghost" type="button" onClick={() => { setMessage(''); if (shotIndex) setShotIndex(i => i - 1); else setScreen('welcome'); }}><ArrowLeft size={16}/>Voltar</button><button className="btn btn-outline" type="button" onClick={() => setScreen('measures')}><Ruler size={17}/>Pular fotos</button><button className="btn btn-primary" type="button" onClick={nextCapture} disabled={busy}>{shotIndex === PHOTO_GUIDES.length - 1 ? 'Conferir medidas' : 'Próxima vista'}<ArrowRight size={17}/></button></div>
    </div>}
    {screen === 'measures' && <div className="scan-card">
      <div className="scan-icon"><Ruler size={27}/></div>
      <h2>Medidas do cômodo</h2>
      <p>Preencha os valores medidos. Os números iniciais são apenas exemplos e não foram calculados a partir das fotos.</p>
      <div className="scan-fields">
        <label className="scan-field scan-wide">Nome do cômodo<input required maxLength={80} value={draft.name} placeholder="Ex.: Quarto principal" onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} /></label>
        {([['width','Largura (m)'],['length','Comprimento (m)'],['height','Altura (m)']] as const).map(([key,label]) =>
          <label className="scan-field" key={key}>{label}<input required type="number" inputMode="decimal" min="0.1" max="100" step="0.01" value={draft[key]} onChange={e => { const v = Number(e.target.value); setDraft(p => ({ ...p, [key]: v })); setConfirmed(false); }} /></label>)}
        <p className="scan-field-note scan-wide">A posição determina onde o cômodo ficará em relação aos outros. Se não souber, mantenha a posição sugerida e ajuste depois em Obras.</p>
        {([['x','Posição X (m)'],['z','Posição Z (m)']] as const).map(([key,label]) =>
          <label className="scan-field" key={key}>{label}<input required type="number" inputMode="decimal" min="-100" max="100" step="0.01" value={draft[key]} onChange={e => { const v = Number(e.target.value); setDraft(p => ({ ...p, [key]: v })); setConfirmed(false); }} /></label>)}
      </div>
      <div className="scan-footer"><button className="btn btn-ghost" type="button" onClick={() => { setMessage(''); setScreen('photos'); }}><ArrowLeft size={16}/>Voltar</button><button className="btn btn-primary" type="button" onClick={reviewMeasures}>Visualizar em 3D<ArrowRight size={16}/></button></div>
    </div>}
    {screen === 'review' && <div className="scan-card">
      <h2>{draft.name.trim()}</h2>
      <p>Esta é uma representação simplificada das medidas informadas, sem portas ou janelas. Arraste para girar.</p>
      <RoomScanPreview draft={draft}/>
      <div className="scan-summary"><div><span>Largura</span><strong>{draft.width} m</strong></div><div><span>Comprimento</span><strong>{draft.length} m</strong></div><div><span>Altura</span><strong>{draft.height} m</strong></div></div>
      <label className="scan-confirm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/><span>Conferi as medidas e entendo que esta planta é ilustrativa, não um levantamento técnico.</span></label>
      <div className="scan-footer"><button type="button" className="btn btn-ghost" onClick={() => { setConfirmed(false); setMessage(''); setScreen('measures'); }}><ArrowLeft size={16}/>Corrigir medidas</button><button type="button" disabled={!confirmed} className="btn btn-primary" onClick={save}><CheckCircle2 size={17}/>Criar cômodo na Planta 3D</button></div>
    </div>}
    {message && <p role="alert" className="scan-error">{message}</p>}
    <p className="scan-bottom-note"><Layers3 size={16}/> Somente o cômodo confirmado será salvo na sua conta.</p>
  </section>;
}
