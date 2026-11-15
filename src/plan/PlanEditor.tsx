import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, DoorOpen, Grid2X2, Plus, RotateCcw, Save, Trash2, AlignCenter } from 'lucide-react';
import type { Room, WallOpening } from '../types';
import { newId, number } from '../data';
import {
  alignRoom, boundsOverlap, getFootprint, getWallSegments, openingPreview,
  polygonArea, roomShapePreset, validateRoomGeometry,
  type AlignmentSide, type ShapePreset,
} from './geometry';

type OpeningDraft = Omit<WallOpening, 'id'>;
const defaultOpening = (room: Room, edge = 0, type: 'door' | 'window' = 'door'): OpeningDraft => {
  const walls = getWallSegments(room);
  const len = walls[edge]?.length ?? 1;
  const width = Math.min(type === 'door' ? 0.9 : 1.2, Math.max(0.2, len - 0.02));
  const sill = type === 'door' ? 0 : Math.min(0.9, Math.max(0, room.height - 0.4));
  const height = type === 'door' ? Math.min(2.1, room.height) : Math.min(1.2, room.height - sill);
  return { type, edge, offset: Math.max(0, (len-width)/2), width, height, sill };
};
type Props = {
  rooms: Room[];
  selectedRoomId: string;
  onSelect: (id: string) => void;
  onSave: (room: Room) => void;
  onBack: () => void;
};

const sides: { value: AlignmentSide; label: string }[] = [
  {value:'north',label:'Acima'}, {value:'south',label:'Abaixo'},
  {value:'east',label:'À direita'}, {value:'west',label:'À esquerda'},
];

export default function PlanEditor({ rooms, selectedRoomId, onSelect, onSave, onBack }: Props) {
  const room = rooms.find(r => r.id === selectedRoomId) ?? rooms[0];
  const [draft, setDraft] = useState<Room | null>(() => room ? structuredClone(room) : null);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [openingDraft, setOpeningDraft] = useState<OpeningDraft>(() => room ? defaultOpening(room) : {type:'door',edge:0,offset:0,width:0.9,height:2.1,sill:0});
  const [targetRoomId, setTargetRoomId] = useState('');
  const [alignment, setAlignment] = useState<AlignmentSide>('east');
  const [gap, setGap] = useState(0);
  const [selectedEdge, setSelectedEdge] = useState(0);

  useEffect(() => {
    if (!room) { setDraft(null); return; }
    setDraft(structuredClone(room));
    setSelectedEdge(0);
    setOpeningDraft(defaultOpening(room));
    setMessage('');
    setSuccess(false);
  }, [room]);

  const points = draft ? getFootprint(draft) : [];
  const segments = draft ? getWallSegments(draft) : [];
  const otherRooms = rooms.filter(r => r.id !== room?.id);
  const overlaps = draft ? otherRooms.filter(r => boundsOverlap(draft, r)) : [];

  const box = useMemo(() => {
    const all = rooms.map(r => r.id === draft?.id ? draft : r).filter((r): r is Room => Boolean(r));
    if (!all.length) return {x:-1,z:-1,width:10,length:8};
    const lowX = Math.min(...all.map(r=>r.x)) - 1;
    const lowZ = Math.min(...all.map(r=>r.z)) - 1;
    const maxX = Math.max(...all.map(r=>r.x+r.width)) + 1;
    const maxZ = Math.max(...all.map(r=>r.z+r.length)) + 1;
    return {x:lowX,z:lowZ,width:Math.max(4,maxX-lowX),length:Math.max(4,maxZ-lowZ)};
  }, [rooms,draft]);

  function edit(next: Room) {
    setDraft(next);
    setSuccess(false);
    setMessage('');
  }

  function choosePreset(shape: ShapePreset) {
    if (!draft) return;
    if (draft.openings?.length && !window.confirm('A alteração do contorno remove os vãos desta edição. Continuar?')) return;
    const next = {...draft, footprint: shape === 'rectangle' ? undefined : roomShapePreset(shape,draft.width,draft.length), openings: []};
    edit(next);
    setSelectedEdge(0);
    setOpeningDraft(defaultOpening(next));
  }

  function editVertex(index: number, axis: 'x' | 'z', value: number) {
    if (!draft) return;
    const copy = getFootprint(draft).map(p=>({...p}));
    copy[index][axis] = value;
    edit({...draft,footprint:copy});
  }

  function insertVertex(index: number) {
    if (!draft) return;
    const copy = getFootprint(draft).map(p=>({...p}));
    if (copy.length >= 24) {setMessage('O limite é de 24 vértices.');return;}
    const next=copy[(index+1)%copy.length],current=copy[index];
    copy.splice(index+1,0,{x:(current.x+next.x)/2,z:(current.z+next.z)/2});
    // Inserting an edge changes wall indices: existing openings must be mapped.
    const openings=(draft.openings??[]).map(o=>({...o,edge:o.edge>index?o.edge+1:o.edge}));
    // An opening on the split edge may span both new edges; avoid silent reassignment.
    if ((draft.openings??[]).some(o=>o.edge===index)) {
      setMessage('Remova os vãos do segmento antes de dividi-lo.');return;
    }
    edit({...draft,footprint:copy,openings});
    setSelectedEdge(index);
  }

  function removeVertex(index: number) {
    if (!draft || points.length<=3) return;
    if (draft.openings?.length) {
      setMessage('Remova os vãos antes de excluir vértices.');return;
    }
    const next=points.filter((_,i)=>i!==index);
    edit({...draft,footprint:next});
    setSelectedEdge(0);
  }

  function setOpeningType(type: 'door' | 'window') {
    if (!draft) return;
    setOpeningDraft(defaultOpening(draft,openingDraft.edge,type));
  }

  function setOpeningEdge(edge: number) {
    if (!draft) return;
    setOpeningDraft(defaultOpening(draft,edge,openingDraft.type));
    setSelectedEdge(edge);
  }

  function addOpening() {
    if (!draft) return;
    try {
      const next = {...draft, openings:[...(draft.openings??[]), {...openingDraft,id:newId()}]};
      validateRoomGeometry(next);
      edit(next);
      setMessage('');
    } catch (problem) { setMessage(problem instanceof Error?problem.message:'Abertura inválida.'); }
  }

  function snapRoom() {
    if (!draft) return;
    const target=otherRooms.find(r=>r.id===targetRoomId);
    if (!target) {setMessage('Selecione um cômodo de referência.');return;}
    try { edit(alignRoom(draft,target,alignment,gap)); }
    catch(problem) {setMessage(problem instanceof Error?problem.message:'Alinhamento inválido.');}
  }

  function save() {
    if (!draft) return;
    try {
      if (![draft.x,draft.z].every(n=>Number.isFinite(n)&&n>=-100&&n<=100)) {
        throw new Error('As posições X/Z devem estar entre -100 m e 100 m.');
      }
      validateRoomGeometry(draft);
      onSave(draft);
      setMessage('');
      setSuccess(true);
    } catch(problem) {
      setSuccess(false);
      setMessage(problem instanceof Error?problem.message:'Não foi possível salvar a planta.');
    }
  }

  if (!room || !draft) return <section className="plan-editor">
    <header className="plan-editor-title"><div><span className="eyebrow dark-eyebrow">EDITOR 2D</span><h1>Editar planta</h1></div><button className="btn btn-outline" onClick={onBack}>Voltar</button></header>
    <div className="empty"><Grid2X2 size={32}/><strong>Nenhum cômodo cadastrado</strong><span>Cadastre ou escaneie um cômodo na seção Obras antes de editar a planta.</span></div>
  </section>;

  return <section className="plan-editor">
    <header className="plan-editor-title"><div><span className="eyebrow dark-eyebrow">EDITOR 2D</span><h1>Editar planta</h1><p>Desenhe os limites, ajuste a posição e abra espaços para portas e janelas. O 3D mostra o resultado.</p></div><button className="btn btn-outline" type="button" onClick={onBack}><ArrowLeft size={16}/>Voltar para o 3D</button></header>
    <div className="plan-editor-layout">
      <div className="plan-editor-controls">
        <div className="plan-panel">
          <h2>1. Escolha o cômodo</h2>
          <label className="plan-field">Cômodo
            <select value={room.id} onChange={event=>onSelect(event.target.value)}>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>
          </label>
          <div className="plan-stats"><div><span>Área do piso</span><strong>{number(Math.abs(polygonArea(points)))} m²</strong></div><div><span>Segmentos</span><strong>{segments.length}</strong></div></div>
        </div>

        <div className="plan-panel">
          <h2>2. Formato do cômodo</h2>
          <p>Escolha um modelo ou ajuste os pontos manualmente. As coordenadas são em metros dentro do cômodo.</p>
          <div className="plan-presets" role="group" aria-label="Modelos de planta">
            <button type="button" onClick={()=>choosePreset('rectangle')}><Grid2X2 size={16}/>Retângulo</button>
            <button type="button" onClick={()=>choosePreset('L')}>Formato L</button>
            <button type="button" onClick={()=>choosePreset('U')}>Formato U</button>
          </div>
          <div className="plan-vertices">
            {points.map((p,i)=><div className="plan-vertex-row" key={i}>
              <strong>P{i+1}</strong>
              <label>X (m)<input aria-label={`Vértice ${i+1}: X em metros`} type="number" step="0.01" min="0" max={draft.width} value={p.x} onChange={e=>editVertex(i,'x',Number(e.target.value))}/></label>
              <label>Z (m)<input aria-label={`Vértice ${i+1}: Z em metros`} type="number" step="0.01" min="0" max={draft.length} value={p.z} onChange={e=>editVertex(i,'z',Number(e.target.value))}/></label>
              <button type="button" className="plan-mini-button" title={`Inserir vértice após P${i+1}`} aria-label={`Inserir vértice após P${i+1}`} onClick={()=>insertVertex(i)}><Plus size={16}/></button>
              <button type="button" className="plan-mini-button" title={`Remover P${i+1}`} aria-label={`Remover P${i+1}`} disabled={points.length<=3} onClick={()=>removeVertex(i)}><Trash2 size={15}/></button>
            </div>)}
          </div>
        </div>

        <div className="plan-panel">
          <h2>3. Portas e janelas</h2>
          <p>Escolha o segmento da parede e informe distância a partir do início, largura e altura do vão.</p>
          <div className="plan-fields-grid">
            <label className="plan-field">Tipo
              <select value={openingDraft.type} onChange={e=>setOpeningType(e.target.value as 'door'|'window')}>
                <option value="door">Porta</option><option value="window">Janela</option>
              </select></label>
            <label className="plan-field">Parede
              <select value={openingDraft.edge} onChange={e=>setOpeningEdge(Number(e.target.value))}>
                {segments.map(segment=><option value={segment.edge} key={segment.edge}>P{segment.edge+1}–P{(segment.edge+1)%points.length+1} · {segment.direction} ({number(segment.length)} m)</option>)}
              </select></label>
            {([
              ['offset','Início (m)'],['width','Largura (m)'],['height','Altura (m)'],['sill','Altura da base (m)'],
            ] as const).map(([key,label])=><label className="plan-field" key={key}>{label}
              <input type="number" step="0.01" min="0" value={openingDraft[key]} disabled={openingDraft.type==='door'&&key==='sill'}
                onChange={e=>setOpeningDraft(p=>({...p,[key]:Number(e.target.value)}))}/>
            </label>)}
          </div>
          <button type="button" className="btn btn-outline full" onClick={addOpening}><Plus size={16}/>Adicionar vão</button>
          {(draft.openings??[]).length>0 && <div className="plan-openings-list">{draft.openings?.map(o=><div key={o.id} className="plan-opening-row">
            <DoorOpen size={16}/><span><strong>{o.type==='door'?'Porta':'Janela'}</strong><small>Parede {o.edge+1} · {number(o.width)} × {number(o.height)} m</small></span>
            <button type="button" className="plan-mini-button" aria-label={`Excluir ${o.type==='door'?'porta':'janela'} da parede ${o.edge+1}`} onClick={()=>edit({...draft,openings:draft.openings?.filter(p=>p.id!==o.id)})}><Trash2 size={16}/></button>
          </div>)}</div>}
        </div>

        <div className="plan-panel">
          <h2>4. Posicionar na casa</h2>
          <p>Informe a posição ou alinhe com a borda de outro cômodo; confira o resultado na vista superior.</p>
          <div className="plan-fields-grid">
            {(['x','z'] as const).map(key=><label className="plan-field" key={key}>Posição {key.toUpperCase()} (m)
              <input type="number" step="0.01" min="-100" max="100" value={draft[key]} onChange={e=>edit({...draft,[key]:Number(e.target.value)})}/>
            </label>)}
          </div>
          {otherRooms.length>0 && <div className="plan-align-controls">
            <label className="plan-field">Referência
              <select value={targetRoomId} onChange={e=>setTargetRoomId(e.target.value)}><option value="">Selecionar cômodo</option>{otherRooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>
            </label>
            <label className="plan-field">Alinhar
              <select value={alignment} onChange={e=>setAlignment(e.target.value as AlignmentSide)}>{sides.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select>
            </label>
            <label className="plan-field">Distância (m)
              <input type="number" min="0" max="20" step="0.01" value={gap} onChange={e=>setGap(Number(e.target.value))}/>
            </label>
            <button className="btn btn-outline" type="button" onClick={snapRoom}><AlignCenter size={16}/>Alinhar cômodo</button>
          </div>}
          {overlaps.length>0 && <p className="plan-warning" role="status">A caixa de medidas deste cômodo se sobrepõe a: {overlaps.map(r=>r.name).join(', ')}. Confira se essa posição está correta.</p>}
        </div>
      </div>

      <div className="plan-editor-preview">
        <div className="plan-panel">
          <div className="plan-preview-heading"><div><h2>Vista superior da casa</h2><p>Toque no cômodo para selecioná-lo. Cada quadrícula equivale a 1 metro.</p></div><RotateCcw size={18}/></div>
          <div className="plan-svg-scroller">
            <svg className="plan-svg" viewBox={`${box.x} ${box.z} ${box.width} ${box.length}`} role="img" aria-label="Vista superior dos cômodos, coordenadas em metros">
              <defs><pattern id="plan-grid" x="0" y="0" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0 L0 0 L0 1" fill="none" stroke="#cddcd3" strokeWidth=".02"/></pattern></defs>
              <rect x={box.x} y={box.z} width={box.width} height={box.length} fill="#f6faf7"/>
              <rect x={box.x} y={box.z} width={box.width} height={box.length} fill="url(#plan-grid)"/>
              {rooms.map(r=>{
                const item = r.id===draft.id?draft:r;
                const verts=getFootprint(item);
                const selected=item.id===draft.id;
                return <g key={r.id}>
                  <polygon points={verts.map(p=>`${item.x+p.x},${item.z+p.z}`).join(' ')}
                    fill={selected?'#d1ebdc':'#e9efeb'} stroke={selected?'#247753':'#769884'} strokeWidth={selected?.065:.045}
                    onClick={()=>onSelect(item.id)} style={{cursor:'pointer'}}/>
                  {getWallSegments(item).map(seg=>(item.openings??[]).filter(o=>o.edge===seg.edge).map(o=>{
                    const [p1,p2]=openingPreview(o,seg);
                    return <line key={o.id} x1={item.x+p1.x} y1={item.z+p1.z} x2={item.x+p2.x} y2={item.z+p2.z}
                      stroke={o.type==='door'?'#b77b3b':'#2d8db5'} strokeWidth=".11" strokeLinecap="square"/>;
                  }))}
                  <text x={item.x+item.width/2} y={item.z+item.length/2} textAnchor="middle" dominantBaseline="middle"
                    fill="#264635" fontSize={Math.min(.24, Math.max(.13,item.width/12))} fontWeight="700" pointerEvents="none">{item.name.slice(0,15)}</text>
                </g>;
              })}
            </svg>
          </div>
          <div className="plan-legend"><span><i className="plan-legend-door"/>Porta</span><span><i className="plan-legend-window"/>Janela</span><span><i className="plan-legend-room"/>Selecionado</span></div>
          <p className="plan-note">O 3D é uma representação para planejamento. Não substitui medidas conferidas ou projeto arquitetônico.</p>
        </div>
        <div className="plan-panel plan-save">
          {message && <p role="alert" className="plan-error">{message}</p>}
          {success && <p role="status" className="plan-success"><Check size={17}/>Alterações salvas. O modelo 3D foi atualizado.</p>}
          <p>As alterações são aplicadas à sua planta e sincronizadas com o Supabase da sua conta.</p>
          <button className="btn btn-primary full" type="button" onClick={save}><Save size={17}/>Salvar planta do cômodo</button>
          <button className="btn btn-outline full" type="button" onClick={onBack}><ArrowLeft size={16}/>Ver Planta 3D</button>
        </div>
      </div>
    </div>
  </section>;
}
