import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import {
  ArrowRight, CameraOff, Crosshair, RefreshCcw, RotateCw, ShieldCheck, Undo2, Video,
} from 'lucide-react';
import { calibrateFloor, reconstructFloorPlan, type ImagePoint, type PlanarScan } from './planarGeometry';

type CameraState = 'starting' | 'active' | 'error' | 'paused';
type Stage = 'reference' | 'outline';
type Props = { onContinue: (plan: PlanarScan) => void; onManual: () => void };

const pointList = (points: ImagePoint[]) => points.map(p=>`${p.x*1000},${p.y*1000}`).join(' ');

export default function LiveCameraPreview({ onContinue, onManual }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [facing,setFacing] = useState<'environment'|'user'>('environment');
  const [restart,setRestart] = useState(0);
  const [state,setState] = useState<CameraState>('starting');
  const [cameraError,setCameraError] = useState('');
  const [reference,setReference] = useState<ImagePoint[]>([]);
  const [boundary,setBoundary] = useState<ImagePoint[]>([]);
  const [stage,setStage] = useState<Stage>('reference');
  const [knownWidth,setKnownWidth] = useState('0.60');
  const [knownLength,setKnownLength] = useState('0.60');
  const [aimX,setAimX] = useState(50);
  const [aimY,setAimY] = useState(50);
  const [notice,setNotice] = useState('');
  const [moved,setMoved] = useState(false);

  const dims=[Number(knownWidth),Number(knownLength)] as const;
  const calculation=useMemo(()=>{
    if (reference.length!==4||boundary.length<3) return {plan:null as PlanarScan|null,error:''};
    try {
      return {plan:reconstructFloorPlan(reference,dims[0],dims[1],boundary),error:''};
    } catch(problem) {
      return {plan:null,error:problem instanceof Error?problem.message:'Confira o contorno marcado.'};
    }
  },[reference,boundary,dims[0],dims[1]]);

  function resetPoints() {
    setReference([]);setBoundary([]);setStage('reference');setMoved(false);setNotice('');
  }

  useEffect(()=>{
    let mounted=true;
    let stream:MediaStream|null=null;
    const stop=()=>{
      stream?.getTracks().forEach(track=>track.stop());
      stream=null;
      if(videoRef.current) videoRef.current.srcObject=null;
    };
    const openCamera=async()=>{
      setState('starting');setCameraError('');
      if(!navigator.mediaDevices?.getUserMedia) {
        if(mounted) {setState('error');setCameraError('A câmera ao vivo não está disponível neste aparelho. Utilize o formulário manual.');}
        return;
      }
      try {
        // A permissão nativa Android é solicitada somente após entrar no fluxo de câmera.
        if(Capacitor.getPlatform()==='android') {
          const perm=await Camera.requestPermissions({permissions:['camera']});
          if(perm.camera!=='granted') throw new DOMException('Permissão de câmera negada','NotAllowedError');
        }
        const videoStream=await navigator.mediaDevices.getUserMedia({
          audio:false,video:{facingMode:{ideal:facing},width:{ideal:1280},height:{ideal:720}},
        });
        if(!mounted||document.visibilityState==='hidden') {
          videoStream.getTracks().forEach(track=>track.stop());
          return;
        }
        stream=videoStream;
        const video=videoRef.current;
        if(video) {video.srcObject=videoStream;await video.play();}
        if(mounted) setState('active');
      } catch(error) {
        stop();
        if(!mounted)return;
        setState('error');
        const name=error instanceof DOMException?error.name:'';
        setCameraError(name==='NotAllowedError'||name==='PermissionDeniedError'
          ? 'A permissão da câmera foi negada. Libere o acesso ou continue manualmente.'
          : 'Não foi possível abrir a câmera. Confira as permissões e tente novamente.');
      }
    };
    const onVisibility=()=>{
      if(document.visibilityState==='hidden') {
        stop();
        if(mounted)setState('paused');
      } else if(mounted) {
        resetPoints();setRestart(i=>i+1);
      }
    };
    document.addEventListener('visibilitychange',onVisibility);
    void openCamera();
    return()=>{mounted=false;document.removeEventListener('visibilitychange',onVisibility);stop();};
  },[facing,restart]);

  // Detector local, grosseiro e conservador: não retém frames; só avisa quando
  // as referências podem ter mudado de posição. Não é rastreamento SLAM.
  useEffect(()=>{
    if(state!=='active'||reference.length===0)return;
    const canvas=document.createElement('canvas');canvas.width=32;canvas.height=24;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)return;
    let last:Uint8ClampedArray|null=null;
    const interval=window.setInterval(()=>{
      const video=videoRef.current;
      if(!video||video.readyState<2||document.visibilityState!=='visible')return;
      try{
        ctx.drawImage(video,0,0,canvas.width,canvas.height);
        const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        const current=new Uint8ClampedArray(32*24);
        for(let i=0;i<current.length;i++) {
          const j=i*4;
          current[i]=Math.round(pixels[j]*.299+pixels[j+1]*.587+pixels[j+2]*.114);
        }
        if(last){
          let average=0,shift=0,changed=0;
          for(let i=0;i<current.length;i++) shift+=current[i]-last[i];
          shift/=current.length;
          for(let i=0;i<current.length;i++){
            const diff=Math.abs(current[i]-last[i]-shift);
            average+=diff;
            if(diff>38)changed++;
          }
          if(average/current.length>23&&changed/current.length>.24) setMoved(true);
        }
        last=current;
      } catch {/* video frames may not be readable in restricted WebViews */ }
    },500);
    return()=>window.clearInterval(interval);
  },[state,reference.length]);

  function mark(p:ImagePoint){
    if(state!=='active'||moved)return;
    setNotice('');
    if(stage==='reference'){
      if(reference.length>=4)return;
      const next=[...reference,p];
      if(next.length===4){
        try {calibrateFloor(next,dims[0],dims[1]);setReference(next);setStage('outline');}
        catch(problem){setNotice(problem instanceof Error?problem.message:'Calibração inválida.');}
      } else setReference(next);
      return;
    }
    if(boundary.length>=24) {setNotice('O limite é de 24 cantos.');return;}
    setBoundary(prev=>[...prev,p]);
  }

  function markFromView(event:MouseEvent<HTMLButtonElement>){
    // Clique acessível por teclado usa as coordenadas dos campos abaixo.
    const rect=event.currentTarget.getBoundingClientRect();
    if(event.detail===0){mark({x:aimX/100,y:aimY/100});return;}
    const x=(event.clientX-rect.left)/rect.width,y=(event.clientY-rect.top)/rect.height;
    mark({x:Math.min(1,Math.max(0,x)),y:Math.min(1,Math.max(0,y))});
  }

  function undo(){
    setNotice('');setMoved(false);
    if(stage==='outline'&&boundary.length>0){setBoundary(prev=>prev.slice(0,-1));return;}
    if(stage==='outline'){setStage('reference');setReference(prev=>prev.slice(0,-1));return;}
    setReference(prev=>prev.slice(0,-1));
  }

  function retry(){
    resetPoints();setRestart(i=>i+1);
  }
  function swapCamera(){
    resetPoints();setFacing(current=>current==='environment'?'user':'environment');
  }

  const overlayMessage=state==='starting'?'Conectando à câmera':state==='paused'?'Câmera pausada':'Câmera indisponível';
  const activePoints=stage==='reference'?reference:boundary;
  const canFinish=Boolean(calculation.plan)&&!moved&&state==='active';

  return <div className="scan-live" aria-label="Reconstrução do piso pela câmera ao vivo">
    <div className="scan-live-instructions" aria-live="polite">
      <span className="scan-live-phase">ETAPA {stage==='reference'?'1 / 2':'2 / 2'}</span>
      <strong>{stage==='reference'?'Calibre a escala do piso':'Marque o limite entre piso e paredes'}</strong>
      <p>{stage==='reference'
        ? 'Mantenha o celular imóvel. Toque nos quatro cantos de uma peça retangular no piso, em sequência ao redor dela, começando por um canto. Informe as medidas reais dos seus dois lados.'
        : 'Sem mover o celular, toque nos cantos do perímetro visível do cômodo em ordem, sem cruzar os lados. Use pelo menos três pontos. O piso deve estar no mesmo plano da referência.'}</p>
    </div>
    <div className="scan-live-viewport">
      <video ref={videoRef} autoPlay muted playsInline aria-label="Transmissão da câmera do aparelho" />
      <svg className="scan-live-markers" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
        {reference.length>0&&<polygon points={pointList(reference)} fill="#60a5fa27" stroke="#60a5fa" strokeWidth="3" strokeDasharray="9 7"/>}
        {boundary.length>0&&<polyline points={pointList(boundary)} fill="none" stroke="#e9fcac" strokeWidth="4"/>}
        {boundary.length>=3&&<line x1={boundary[boundary.length-1].x*1000} y1={boundary[boundary.length-1].y*1000} x2={boundary[0].x*1000} y2={boundary[0].y*1000} stroke="#e9fcac" strokeDasharray="10 8" strokeWidth="3"/>}
        {reference.map((p,i)=><g key={'r'+i}><circle cx={p.x*1000} cy={p.y*1000} r="13" fill="#60a5fa" stroke="#fff" strokeWidth="2"/><text x={p.x*1000} y={p.y*1000-22} textAnchor="middle" fill="white" fontWeight="bold" fontSize="28">{i+1}</text></g>)}
        {boundary.map((p,i)=><g key={'b'+i}><circle cx={p.x*1000} cy={p.y*1000} r="12" fill="#e9fcac" stroke="#10253c" strokeWidth="2"/><text x={p.x*1000} y={p.y*1000-22} textAnchor="middle" fill="#e9fcac" fontWeight="bold" fontSize="28">{i+1}</text></g>)}
      </svg>
      {state==='active'&&<button type="button" className="scan-live-tap" onClick={markFromView} disabled={moved}
        aria-label={stage==='reference'?'Marcar canto da referência no vídeo':'Marcar canto do cômodo no vídeo'}/>}
      <div className="scan-live-label"><Video size={16}/>{state==='active'?'Câmera ao vivo · Sem gravação':'Câmera interrompida'}</div>
      <div className="scan-live-count"><Crosshair size={16}/>{activePoints.length} / {stage==='reference'?'4':'24'} pontos</div>
      {state!=='active'&&<div className="scan-live-overlay" role="status"><CameraOff size={34}/><strong>{overlayMessage}</strong>{state==='error'&&<span>{cameraError}</span>}</div>}
    </div>
    <div className="scan-live-fields">
      <label>Referência — lado 1 (m)<input type="number" inputMode="decimal" min=".1" max="10" step=".01" value={knownWidth} onChange={e=>{setKnownWidth(e.target.value);setNotice('');}}/></label>
      <label>Referência — lado 2 (m)<input type="number" inputMode="decimal" min=".1" max="10" step=".01" value={knownLength} onChange={e=>{setKnownLength(e.target.value);setNotice('');}}/></label>
    </div>
    <details className="scan-live-accessible">
      <summary>Marcar pontos pelo teclado (alternativa ao toque)</summary>
      <p>Informe a posição do próximo ponto no enquadramento, em porcentagem da largura e altura.</p>
      <div className="scan-live-fields">
        <label>Posição horizontal (%)<input type="number" min="0" max="100" value={aimX} onChange={e=>setAimX(Math.min(100,Math.max(0,Number(e.target.value))))}/></label>
        <label>Posição vertical (%)<input type="number" min="0" max="100" value={aimY} onChange={e=>setAimY(Math.min(100,Math.max(0,Number(e.target.value))))}/></label>
        <button className="btn btn-outline" type="button" disabled={state!=='active'||moved} onClick={()=>mark({x:aimX/100,y:aimY/100})}>Adicionar ponto</button>
      </div>
    </details>
    {moved&&<p className="scan-live-warning" role="alert">O enquadramento pode ter mudado. Refaça a calibração e os pontos sem mover o celular, para evitar medidas incorretas. <button type="button" onClick={resetPoints}>Recomeçar marcações</button></p>}
    {notice&&<p className="scan-live-warning" role="alert">{notice}</p>}
    {calculation.error&&<p className="scan-live-warning" role="status">{calculation.error}</p>}
    {calculation.plan&&<div className="scan-live-result" role="status">
      <strong>Planta inicial estimada</strong>
      <span>Largura {calculation.plan.width.toFixed(2)} m</span>
      <span>Comprimento {calculation.plan.length.toFixed(2)} m</span>
      <span>Área {calculation.plan.area.toFixed(2)} m²</span>
      <small>Estimativa do piso, dependente da calibração e de pontos no mesmo plano. Altura não detectada.</small>
    </div>}
    <div className="scan-privacy"><ShieldCheck size={18}/><span>Geometria calculada no aparelho. Quadros temporários são usados apenas para verificar mudanças no enquadramento; não são gravados ou enviados ao Supabase.</span></div>
    <div className="scan-actions">
      <button type="button" className="btn btn-outline" onClick={undo} disabled={reference.length===0&&boundary.length===0}><Undo2 size={16}/>Desfazer ponto</button>
      <button type="button" className="btn btn-outline" onClick={resetPoints}>Limpar marcações</button>
      <button type="button" className="btn btn-outline" onClick={swapCamera}><RotateCw size={16}/>Trocar câmera</button>
      {state!=='active'&&<button type="button" className="btn btn-outline" onClick={retry}><RefreshCcw size={16}/>Tentar novamente</button>}
      <button type="button" className="btn btn-outline" onClick={onManual}>Usar modo manual</button>
      <button type="button" className="btn btn-primary" disabled={!canFinish} onClick={()=>calculation.plan&&onContinue(calculation.plan)}>Usar contorno estimado<ArrowRight size={16}/></button>
    </div>
  </div>;
}
