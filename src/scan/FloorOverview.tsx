import { getFootprint } from '../plan/geometry';
import type { RoomScanDraft } from './roomScan';

type Props={draft:RoomScanDraft};

export default function FloorOverview({draft}:Props){
  const vertices=getFootprint(draft);
  if(!(draft.width>0 && draft.length>0))return null;
  const points=vertices.map(p=>`${p.x},${p.z}`).join(' ');
  return <div className="scan-floor-review">
    <div>
      <strong>Contorno do piso</strong>
      <p>{draft.footprint ? 'Formato estimado pela câmera, ajustado proporcionalmente às medidas que você informou.' : 'Prévia retangular baseada nas medidas informadas.'}</p>
    </div>
    <svg className="scan-floor-svg"
      viewBox={`-0.25 -0.25 ${draft.width+.5} ${draft.length+.5}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Vista superior do piso com ${vertices.length} cantos, largura ${draft.width} metros e comprimento ${draft.length} metros.`}>
      <polygon points={points} fill="#dbeafe" stroke="#2563eb"
        strokeWidth={Math.max(0.02,Math.min(draft.width,draft.length)*.015)}
        strokeLinejoin="round"/>
      {vertices.map((p,i)=><circle key={i} cx={p.x} cy={p.z}
        r={Math.max(.045,Math.min(draft.width,draft.length)*.02)}
        fill="#1e40af" stroke="white" strokeWidth=".012"/>)}
    </svg>
    <p className="scan-floor-note">Vista superior ilustrativa. Confira cantos e proporções antes de salvar. Você poderá editar vértices, portas e janelas na Planta 2D.</p>
  </div>;
}
