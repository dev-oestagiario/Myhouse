import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CameraOff, RefreshCcw, RotateCw, ShieldCheck, Video } from 'lucide-react';

type CameraState = 'starting' | 'active' | 'error' | 'paused';

type Props = {
  onContinue: () => void;
  onManual: () => void;
};

export default function LiveCameraPreview({ onContinue, onManual }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [restart, setRestart] = useState(0);
  const [state, setState] = useState<CameraState>('starting');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    let stream: MediaStream | null = null;
    const stop = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    };
    const openCamera = async () => {
      setState('starting');
      setError('');
      if (!navigator.mediaDevices?.getUserMedia) {
        if (mounted) {
          setState('error');
          setError('A câmera ao vivo não está disponível neste navegador ou aparelho. Use a entrada manual.');
        }
        return;
      }
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!mounted || document.visibilityState === 'hidden') {
          videoStream.getTracks().forEach(track => track.stop());
          return;
        }
        stream = videoStream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = videoStream;
          await video.play();
        }
        if (mounted) setState('active');
      } catch (reason) {
        stop();
        if (!mounted) return;
        setState('error');
        const name = reason instanceof DOMException ? reason.name : '';
        setError(name === 'NotAllowedError' || name === 'PermissionDeniedError'
          ? 'A permissão da câmera foi negada. Libere o acesso nas configurações ou continue manualmente.'
          : 'Não foi possível abrir a câmera ao vivo. Confira as permissões ou use o modo manual.');
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stop();
        if (mounted) setState('paused');
      } else if (mounted) setRestart(current => current + 1);
    };
    document.addEventListener('visibilitychange', onVisibility);
    void openCamera();
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [facing, restart]);

  return <div className="scan-live" aria-label="Câmera ao vivo">
    <div className="scan-live-viewport">
      <video ref={videoRef} autoPlay muted playsInline aria-label="Transmissão ao vivo da câmera do aparelho" />
      <div className="scan-live-reticle" aria-hidden="true"><span/><span/><span/><span/></div>
      <div className="scan-live-label"><Video size={16}/> {state === 'active' ? 'Câmera ao vivo' : state === 'starting' ? 'Abrindo câmera…' : 'Câmera interrompida'}</div>
      {state !== 'active' && <div className="scan-live-overlay" role="status">
        <CameraOff size={34}/>
        <strong>{state === 'starting' ? 'Conectando à câmera' : state === 'paused' ? 'Câmera pausada' : 'Câmera indisponível'}</strong>
        {state === 'error' && <span>{error}</span>}
      </div>}
    </div>
    <div className="scan-live-guidance">
      <strong>Mostre lentamente o piso, as paredes e os cantos.</strong>
      <p>Esta etapa habilita a visualização contínua, sem tirar fotos ou gravar vídeo. A reconstrução automática em aparelhos sem ARCore será adicionada na etapa 2; por enquanto, confira as dimensões manualmente.</p>
    </div>
    <div className="scan-privacy"><ShieldCheck size={19}/><span>A transmissão da câmera fica somente neste aparelho. Não capturamos imagens, não gravamos vídeo e não enviamos quadros ao Supabase.</span></div>
    <div className="scan-actions">
      <button type="button" className="btn btn-outline" onClick={() => setFacing(current => current === 'environment' ? 'user' : 'environment')}><RotateCw size={17}/>Trocar câmera</button>
      {state !== 'active' && <button type="button" className="btn btn-outline" onClick={() => setRestart(current => current + 1)}><RefreshCcw size={17}/>Tentar novamente</button>}
      <button type="button" className="btn btn-outline" onClick={onManual}>Usar modo manual</button>
      <button type="button" className="btn btn-primary" onClick={onContinue} disabled={state !== 'active'}>Conferir medidas<ArrowRight size={17}/></button>
    </div>
  </div>;
}
