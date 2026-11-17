import {DeferredView} from '../../shared/DeferredView';
import {Feedback} from '../../shared/UiState';
import { useEffect, useMemo, useState, type FormEvent, type PointerEvent } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Copy, Grid2X2, Move, Plus, RotateCw, Trash2 } from 'lucide-react';
import type { HomeData, ProjectScenario, ScenarioFurniture, FurnitureColor, FurnitureKind } from '../../types';
import { newId,number } from '../../data';
import { getFootprint, getWallSegments } from '../../plan/geometry';
import {lazy} from 'react';
const HouseModel=lazy(()=>import('../../plan/HouseModel'));
import {
  FURNITURE_CATALOG,FURNITURE_COLORS,alignFurnitureToWall,furnitureCollisions,
  furnitureCorners,placeFurniture,duplicateFurniture,
} from './furnitureGeometry';
import {
  addScenarioFurniture,removeScenarioFurniture,updateScenarioFurniture,
} from './scenarioDomain';
import './interiors.css';

type Props={home:HomeData;scenario:ProjectScenario;archived:boolean;onChange:(next:HomeData)=>void};
const r2=(n:number)=>Math.round(n*100)/100;

export default function InteriorWorkspace({home,scenario,archived,onChange}:Props){
  const [roomId,setRoomId]=useState(()=>scenario.rooms[0]?.id??'');
  const room=scenario.rooms.find(r=>r.id===roomId)??scenario.rooms[0];
  const roomFurniture=useMemo(()=>scenario.furniture.filter(item=>item.roomId===room?.id),
    [scenario.furniture,room?.id]);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const selected=scenario.furniture.find(item=>item.id===selectedId)??null;
  const [draft,setDraft]=useState<ScenarioFurniture|null>(null);
  const [wallEdge,setWallEdge]=useState(0);
  const [feedback,setFeedback]=useState('');
  const [error,setError]=useState('');
  const [dragId,setDragId]=useState<string|null>(null);
  const [dragPreview,setDragPreview]=useState<ScenarioFurniture|null>(null);
  const [filter,setFilter]=useState('todos');
  const wallSegments=room?getWallSegments(room):[];
  useEffect(()=>{
    setDraft(selected?structuredClone(selected):null);
    if(selected)setWallEdge(0);
  },[selectedId,scenario.updatedAt]);
  const catalogue=FURNITURE_CATALOG.filter(entry=>filter==='todos'||entry.group===filter);
  const groups=[...new Set(FURNITURE_CATALOG.map(entry=>entry.group))];
  const previewFurniture=roomFurniture.map(item=>dragPreview?.id===item.id?dragPreview:
    selectedId===item.id&&draft?draft:item);
  const warning=draft?furnitureCollisions(
    scenario.furniture.map(item=>item.id===draft.id?draft:item),draft.id):[];
  function selectItem(item:ScenarioFurniture){
    setSelectedId(item.id);setRoomId(item.roomId);setError('');setFeedback('');
    setDraft(structuredClone(item));
  }
  function commit(action:()=>HomeData,msg:string):boolean{
    try{onChange(action());setFeedback(msg);setError('');return true;}
    catch(problem){setError(problem instanceof Error?problem.message:'Não foi possível salvar as mudanças.');return false;}
  }
  function insert(kind:FurnitureKind){
    if(!room||archived)return;
    try{
      const item=placeFurniture(kind,room,scenario.furniture,newId());
      if(commit(()=>addScenarioFurniture(home,scenario.id,item,newId(),new Date().toISOString()),
        item.name+' adicionado à proposta. Aguarde a sincronização.')){
        setSelectedId(item.id);setDraft(item);
      }
    }catch(problem){setError(problem instanceof Error?problem.message:'Não foi possível incluir o objeto.');}
  }
  function save(e?:FormEvent){
    e?.preventDefault();
    if(!draft||archived)return;
    if(commit(()=>updateScenarioFurniture(home,scenario.id,draft,newId(),new Date().toISOString()),
      'Posição e medidas do móvel salvas na proposta.'))setDraft(null);
  }
  function remove(){
    if(!selected||archived)return;
    if(!window.confirm(`Remover "${selected.name}" deste cenário? A versão anterior ficará no histórico.`))return;
    if(commit(()=>removeScenarioFurniture(home,scenario.id,selected.id,newId(),new Date().toISOString()),
      'Objeto removido da proposta.')){setSelectedId(null);setDraft(null);}
  }
  function duplicate(){
    if(!selected||!room||archived)return;
    try{
      const placed=duplicateFurniture(selected,room,scenario.furniture,newId());
      if(commit(()=>addScenarioFurniture(home,scenario.id,placed,
        newId(),new Date().toISOString()),'Cópia do objeto adicionada ao cenário.')){
        setSelectedId(placed.id);setDraft(placed);
      }
    }catch(problem){setError(problem instanceof Error?problem.message:'Não foi possível duplicar este móvel.');}
  }
  function nudge(axis:'x'|'z',offset:number){
    if(!draft)return;
    setDraft({...draft,[axis]:r2(draft[axis]+offset)});
  }
  function rotate(){
    if(!draft)return;
    setDraft({...draft,rotation:(draft.rotation+90)%360});
  }
  function align(){
    if(!draft||!room)return;
    try{setDraft(alignFurnitureToWall(draft,room,wallEdge));setError('');
      setFeedback('Alinhamento calculado. Clique em Salvar móvel para confirmar.');}
    catch(problem){setError(problem instanceof Error?problem.message:'Não foi possível alinhar.');}
  }
  function localPoint(e:PointerEvent<SVGSVGElement>):{x:number;z:number}|null{
    if(!room)return null;
    const svg=e.currentTarget,ctm=svg.getScreenCTM();
    if(!ctm)return null;
    const pt=svg.createSVGPoint();
    pt.x=e.clientX;pt.y=e.clientY;
    const world=pt.matrixTransform(ctm.inverse());
    return{x:r2(world.x-room.x),z:r2(world.y-room.z)};
  }
  function onMove(e:PointerEvent<SVGSVGElement>){
    if(!dragId||!room)return;
    const item=scenario.furniture.find(x=>x.id===dragId);
    const position=localPoint(e);
    if(item&&position)setDragPreview({...item,...position});
  }
  function onRelease(e:PointerEvent<SVGSVGElement>){
    if(!dragId)return;
    const item=scenario.furniture.find(x=>x.id===dragId);
    const position=localPoint(e);
    if(item&&position&&!archived){
      const moved={...item,...position};
      if(commit(()=>updateScenarioFurniture(home,scenario.id,moved,newId(),new Date().toISOString()),
        'Objeto movido na planta do cenário.')){setSelectedId(item.id);setDraft(moved);}
    }
    setDragId(null);setDragPreview(null);
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  }
  const map=room?{x:room.x-.5,z:room.z-.5,width:room.width+1,depth:room.length+1}:null;
  return <section className="interior-workspace" aria-label="Editor de interiores">
    <header className="interior-head">
      <div><h4>Editor de interiores</h4><p>Adicione e organize móveis nesta proposta. Toque no objeto no 3D ou arraste-o na planta 2D.</p></div>
      <label>Ambiente
        <select aria-label="Ambiente dos móveis" value={room?.id??''} onChange={e=>{setRoomId(e.target.value);setSelectedId(null);setDraft(null);setError('');}}>
          {scenario.rooms.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}
        </select>
      </label>
    </header>
    {error&&<Feedback tone="error">{error}</Feedback>}
    {feedback&&<Feedback tone="info">{feedback}</Feedback>}
    {!room?<p className="interior-empty">Adicione um cômodo ao cenário para começar a distribuir móveis.</p>:<>
      <div className="interior-views">
        <section className="interior-canvas-panel"><h5>Visão 3D interativa</h5>
          <div className="interior-model"><DeferredView title="Carregando modelo 3D…"><HouseModel rooms={scenario.rooms}
            selectedRoomId={room.id} selectedWall="leste"
            onSelect={id=>setRoomId(id)}
            furniture={previewFurniture.concat(scenario.furniture.filter(item=>item.roomId!==room.id))}
            selectedFurnitureId={selectedId??''} onSelectFurniture={id=>{
              const found=scenario.furniture.find(item=>item.id===id);if(found)selectItem(found);
            }}/></DeferredView></div>
        </section>
        <section className="interior-canvas-panel"><h5>Planta 2D · arraste os móveis para mover</h5>
          {map&&<svg className="interior-floor-map"
            viewBox={`${map.x} ${map.z} ${map.width} ${map.depth}`}
            role="img" aria-label={`Planta editável dos móveis de ${room.name}`}
            onPointerMove={onMove} onPointerUp={onRelease}
            onPointerCancel={()=>{setDragId(null);setDragPreview(null);}}>
            <defs><pattern id="interior-meter-grid" x="0" y="0" width="1" height="1" patternUnits="userSpaceOnUse">
              <path d="M1 0 L0 0 L0 1" fill="none" stroke="#c7d8ed" strokeWidth=".014"/></pattern></defs>
            <rect x={map.x} y={map.z} width={map.width} height={map.depth} fill="#f6f9ff"/>
            <rect x={map.x} y={map.z} width={map.width} height={map.depth} fill="url(#interior-meter-grid)"/>
            <polygon points={getFootprint(room).map(pt=>`${room.x+pt.x},${room.z+pt.z}`).join(' ')}
              fill="#edf3fd" stroke="#4073ba" strokeWidth=".058"/>
            {previewFurniture.map(item=><g key={item.id} className="interior-floor-object"
              onPointerDown={e=>{
                if(archived)return;
                e.preventDefault();e.stopPropagation();
                setDragId(item.id);setDragPreview(item);setSelectedId(item.id);setDraft(structuredClone(item));
                e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);
              }}>
              <polygon points={furnitureCorners(item).map(pt=>`${room.x+pt.x},${room.z+pt.z}`).join(' ')}
                fill={FURNITURE_COLORS[item.color].hex} fillOpacity=".92"
                stroke={selectedId===item.id?'#174fbb':'#587596'} strokeWidth={selectedId===item.id ? .065 : .025}/>
              <text x={room.x+item.x} y={room.z+item.z} textAnchor="middle" dominantBaseline="middle"
                fontSize=".18" fill="#173b64" pointerEvents="none">{item.name.length>14?item.name.slice(0,12)+'…':item.name}</text>
            </g>)}
          </svg>}
          <p>1 unidade = 1 metro · salve as alterações no painel para confirmar ajustes numéricos.</p>
        </section>
      </div>
      <div className="interior-workspace-bottom">
        <section className="interior-catalog"><div className="interior-section-header"><h5>Catálogo de objetos</h5><span>{FURNITURE_CATALOG.length} modelos geométricos</span></div>
          <label>Categoria
            <select aria-label="Filtrar catálogo de móveis" value={filter} onChange={e=>setFilter(e.target.value)}>
              <option value="todos">Todas</option>{groups.map(group=><option value={group} key={group}>{group}</option>)}
            </select>
          </label>
          <div className="interior-catalog-grid">{catalogue.map(item=><button type="button" key={item.kind}
            disabled={archived||scenario.furniture.length>=120} onClick={()=>insert(item.kind)}
            aria-label={`Adicionar ${item.label.toLowerCase()}`} className="interior-catalog-item">
            <span className="interior-catalog-icon" style={{background:FURNITURE_COLORS[item.color].hex}}/>
            <span><strong>{item.label}</strong><small>{number(item.width)} × {number(item.depth)} m</small></span>
            <Plus size={15}/>
          </button>)}</div>
        </section>
        <section className="interior-inspector">
          <div className="interior-section-header"><h5>Propriedades do objeto</h5><span>{roomFurniture.length} no ambiente</span></div>
          <div className="interior-item-picker" role="group" aria-label="Objetos do ambiente">
            {roomFurniture.length?roomFurniture.map(item=><button key={item.id} type="button"
              aria-pressed={selectedId===item.id} onClick={()=>selectItem(item)}>{item.name}</button>)
              :<p>Adicione um objeto do catálogo para editar suas medidas e posição.</p>}
          </div>
          {draft&&selected&&draft.roomId===room.id?<form className="interior-editor" onSubmit={save}>
            <div className="interior-field"><label htmlFor="furniture-name">Nome do móvel</label><input id="furniture-name" maxLength={120} required value={draft.name}
              disabled={archived} onChange={e=>setDraft({...draft,name:e.target.value})}/></div>
            <div className="interior-fields-two">
              <div className="interior-field"><label htmlFor="furniture-x">Posição X (m)</label><input id="furniture-x" type="number" step=".01" value={draft.x} disabled={archived} onChange={e=>setDraft({...draft,x:Number(e.target.value)})}/></div>
              <div className="interior-field"><label htmlFor="furniture-z">Posição Z (m)</label><input id="furniture-z" type="number" step=".01" value={draft.z} disabled={archived} onChange={e=>setDraft({...draft,z:Number(e.target.value)})}/></div>
            </div>
            <div className="interior-fields-three">{([['width','Largura (m)'],['depth','Profundidade (m)'],['height','Altura (m)']] as const).map(([key,label])=><div className="interior-field" key={key}>
              <label htmlFor={`furniture-${key}`}>{label}</label><input id={`furniture-${key}`} type="number" min={key==='height'?'.01':'.1'} max={key==='height'?'4':'6'} step=".01" required disabled={archived}
                value={draft[key]} onChange={e=>setDraft({...draft,[key]:Number(e.target.value)})}/></div>)}</div>
            <div className="interior-fields-two">
              <div className="interior-field"><label htmlFor="furniture-angle">Rotação (°)</label><input id="furniture-angle" type="number" min="0" max="359" step="1" value={draft.rotation} disabled={archived}
                onChange={e=>setDraft({...draft,rotation:Number(e.target.value)})}/></div>
              <div className="interior-field"><label htmlFor="furniture-color">Acabamento</label><select id="furniture-color" value={draft.color} disabled={archived}
                onChange={e=>setDraft({...draft,color:e.target.value as FurnitureColor})}>
                {Object.entries(FURNITURE_COLORS).map(([value,data])=><option key={value} value={value}>{data.label}</option>)}
              </select></div>
            </div>
            {!archived&&<>
              <div className="interior-quick-actions" role="group" aria-label="Posição rápida">
                <button type="button" title="Mover 10 centímetros à esquerda" aria-label="Mover para esquerda" onClick={()=>nudge('x',-.1)}><ArrowLeft size={16}/></button>
                <button type="button" title="Mover 10 centímetros para cima" aria-label="Mover para cima" onClick={()=>nudge('z',-.1)}><ArrowUp size={16}/></button>
                <button type="button" title="Mover 10 centímetros para baixo" aria-label="Mover para baixo" onClick={()=>nudge('z',.1)}><ArrowDown size={16}/></button>
                <button type="button" title="Mover 10 centímetros à direita" aria-label="Mover para direita" onClick={()=>nudge('x',.1)}><ArrowRight size={16}/></button>
                <button type="button" title="Girar 90 graus" aria-label="Girar 90 graus" onClick={rotate}><RotateCw size={16}/></button>
              </div>
              <div className="interior-align">
                <label htmlFor="furniture-wall">Alinhar com parede</label>
                <div><select id="furniture-wall" value={wallEdge} onChange={e=>setWallEdge(Number(e.target.value))}>
                  {wallSegments.map(segment=><option key={segment.edge} value={segment.edge}>
                    Parede {segment.edge+1} · {number(segment.length)} m</option>)}
                </select><button type="button" className="btn btn-outline" onClick={align}><Move size={16}/>Alinhar</button></div>
              </div>
            </>}
            {!!warning.length&&<p className="interior-overlap" role="status">
              Possível sobreposição com: {warning.map(item=>item.name).join(', ')}. Confira a circulação e o encaixe.</p>}
            <p className="interior-tip">Posições são relativas ao canto superior esquerdo do cômodo. Alterações numéricas entram no histórico ao salvar.</p>
            <div className="interior-editor-actions">
              <button type="submit" className="btn btn-primary" disabled={archived}><Check size={16}/>Salvar móvel</button>
              <button type="button" className="btn btn-outline" disabled={archived} onClick={duplicate}><Copy size={16}/>Duplicar</button>
              <button type="button" className="btn btn-outline" disabled={archived} onClick={remove}><Trash2 size={16}/>Remover</button>
            </div>
          </form>:<div className="interior-no-selection"><Grid2X2 size={23}/><p>Selecione um móvel na lista ou na visualização 3D para editar.</p></div>}
        </section>
      </div>
      <p className="interior-safety-note">Modelos esquemáticos para planejar circulação e distribuição. As medidas devem ser verificadas antes de comprar móveis ou executar obras.</p>
    </>}
  </section>;
}
