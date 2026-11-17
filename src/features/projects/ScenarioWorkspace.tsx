import {Feedback,EmptyState} from '../../shared/UiState';
import Disclosure from '../../shared/Disclosure';
import FloatingActions from '../../shared/FloatingActions';
import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft, Check, Copy, DoorOpen, Edit3, GitCompareArrows, Grid2X2, History,
  Layers3, RotateCcw, Trash2,
} from 'lucide-react';
import type { Direction, HomeData, Project, ProjectScenario, Room, ScenarioFurniture } from '../../types';
import { newId, nextRoomPosition, number } from '../../data';
import { getFootprint } from '../../plan/geometry';
import HouseModel from '../../plan/HouseModel';
import InteriorWorkspace from './InteriorWorkspace';
import OutdoorWorkspace from './OutdoorWorkspace';
import { furnitureCorners, FURNITURE_COLORS } from './furnitureGeometry';
import PlanEditor from '../../plan/PlanEditor';
import Modal from '../../shared/Modal';
import { scenarioSummary } from '../../domain/scenarioValidation';
import {
  changeScenarioRoom, createScenario, createScenarioRoom, deleteScenario,
  duplicateScenario, removeScenarioRoom, renameScenario, resetScenarioToActual,
  resizeScenarioRoom, restoreScenarioRevision, type ScenarioStart,
} from './scenarioDomain';
import './scenarios.css';

type Props={home:HomeData;project:Project;selectedId:string|null;onSelectScenario:(id:string|null)=>void;onChange:(next:HomeData)=>void;onOpenTasks:()=>void;onOpenBudget:()=>void};
type ScenarioView='tridimensional'|'editor'|'comparar'|'interiores'|'externos';
type RoomDraft={name:string;width:number;length:number;height:number;x:number;z:number};
function PlanMap({rooms,label,furniture=[]}:{rooms:Room[];label:string;furniture?:ScenarioFurniture[]}){
  if(!rooms.length)return <div className="scenario-map-empty">Nenhum cômodo nesta planta.</div>;
  const minX=Math.min(...rooms.map(r=>r.x))-0.8,minZ=Math.min(...rooms.map(r=>r.z))-0.8;
  const maxX=Math.max(...rooms.map(r=>r.x+r.width))+0.8,maxZ=Math.max(...rooms.map(r=>r.z+r.length))+0.8;
  return <svg className="scenario-map" viewBox={`${minX} ${minZ} ${Math.max(4,maxX-minX)} ${Math.max(4,maxZ-minZ)}`}
    role="img" aria-label={`Planta 2D de ${label}`}>
    {rooms.map((room,i)=><g key={room.id}>
      <polygon points={getFootprint(room).map(pt=>`${room.x+pt.x},${room.z+pt.z}`).join(' ')}
        fill={i%2?'#e2ecfb':'#d6e5fc'} stroke="#2c67b4" strokeWidth=".065"/>
      <text x={room.x+room.width/2} y={room.z+room.length/2} textAnchor="middle"
        dominantBaseline="middle" fontSize=".31" fill="#1e477a">{room.name.length>18?room.name.slice(0,18)+'…':room.name}</text>
    </g>)}
    {furniture.map(item=>{
      const room=rooms.find(x=>x.id===item.roomId);
      return room?<polygon key={item.id}
        points={furnitureCorners(item).map(pt=>`${room.x+pt.x},${room.z+pt.z}`).join(' ')}
        fill={FURNITURE_COLORS[item.color].hex} stroke="#27578c" strokeWidth=".035"/>:null;
    })}
  </svg>;
}
const roomDraft=(room?:Room,rooms:Room[]=[]):RoomDraft=>{
  const position=nextRoomPosition(rooms);
  return room?{name:room.name,width:room.width,length:room.length,height:room.height,x:room.x,z:room.z}
    :{name:'Novo espaço',width:3,length:3,height:2.7,x:position.x,z:position.z};
};
const shortDate=(value:string)=>new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});

export default function ScenarioWorkspace({home,project,selectedId,onSelectScenario:setSelectedId,onChange,onOpenTasks,onOpenBudget}:Props){
  const scenarios=home.scenarios.filter(item=>item.projectId===project.id)
    .sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  const scenario=scenarios.find(item=>item.id===selectedId)??null;
  const [view,setView]=useState<ScenarioView>('tridimensional');
  useEffect(()=>{setView('tridimensional');setModal(null);},[selectedId]);
  const [selectedRoomId,setSelectedRoomId]=useState('');
  const [selectedWall,setSelectedWall]=useState<Direction>('leste');
  const [modal,setModal]=useState<'new'|'rename'|'room'|null>(null);
  const [newMode,setNewMode]=useState<ScenarioStart>('projeto');
  const [name,setName]=useState('');
  const [description,setDescription]=useState('');
  const [roomEditId,setRoomEditId]=useState<string|null>(null);
  const [roomFields,setRoomFields]=useState<RoomDraft>(()=>roomDraft());
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const archived=Boolean(project.archivedAt);
  const actualRooms=home.rooms.filter(room=>project.spaceIds.some(id=>
    home.spaces.some(space=>space.id===id&&space.roomId===room.id)));
  const activeRoom=scenario?.rooms.find(room=>room.id===selectedRoomId)??scenario?.rooms[0];
  const activeRoomId=activeRoom?.id??'';
  const comparison=scenario?scenarioSummary(scenario,actualRooms):null;
  function run(work:()=>HomeData,text:string){
    try{onChange(work());setError('');setMessage(text);return true;}
    catch(failure){setError(failure instanceof Error?failure.message:'Não foi possível alterar este cenário.');return false;}
  }
  function selectScenario(item:ProjectScenario){
    setSelectedId(item.id);setSelectedRoomId(item.rooms[0]?.id??'');
    setSelectedWall('leste');setView('tridimensional');setError('');setMessage('');
  }
  function startNew(){setModal('new');setName('Nova proposta');setNewMode('projeto');setError('');}
  function commitNew(e:FormEvent){
    e.preventDefault();
    const id=newId();
    if(run(()=>createScenario(home,project.id,name,id,new Date().toISOString(),newMode),'Cenário criado. A planta atual foi preservada.')){
      setSelectedId(id);setSelectedRoomId(newMode==='projeto'?actualRooms[0]?.id??'':'');
      setModal(null);setView('tridimensional');
    }
  }
  function duplicate(item:ProjectScenario){
    const id=newId();
    if(run(()=>duplicateScenario(home,item.id,id,`${item.name} — alternativa`,new Date().toISOString()),'Alternativa independente criada.')){
      setSelectedId(id);setSelectedRoomId(item.rooms[0]?.id??'');setView('tridimensional');
    }
  }
  function openRename(){if(!scenario)return;setName(scenario.name);setDescription(scenario.description);setError('');setModal('rename');}
  function commitRename(e:FormEvent){
    e.preventDefault();
    if(!scenario)return;
    if(run(()=>renameScenario(home,scenario.id,name,description,new Date().toISOString()),'Dados do cenário atualizados.'))setModal(null);
  }
  function removeScene(item:ProjectScenario){
    if(!window.confirm(`Excluir definitivamente o cenário "${item.name}" e suas versões anteriores? A planta real não será modificada.`))return;
    if(run(()=>deleteScenario(home,item.id),'Cenário excluído. A planta real continua intacta.')){
      if(selectedId===item.id){setSelectedId(null);setView('tridimensional');}
    }
  }
  function editRoom(room?:Room){
    if(archived)return;
    setRoomEditId(room?.id??null);setRoomFields(roomDraft(room,scenario?.rooms??[]));setError('');setModal('room');
  }
  function commitRoom(e:FormEvent){
    e.preventDefault();
    if(!scenario)return;
    const at=new Date().toISOString();
    const done=roomEditId
      ?run(()=>resizeScenarioRoom(home,scenario.id,roomEditId,roomFields,newId(),at),'Cômodo atualizado apenas nesta proposta.')
      :run(()=>createScenarioRoom(home,scenario.id,{id:newId(),...roomFields},newId(),at),'Novo espaço adicionado apenas nesta proposta.');
    if(done){setModal(null);setView('tridimensional');}
  }
  function removeRoom(room:Room){
    if(!scenario||!window.confirm(`Remover "${room.name}" apenas deste cenário? A planta real não será modificada.`))return;
    if(run(()=>removeScenarioRoom(home,scenario.id,room.id,newId(),new Date().toISOString()),'Espaço removido somente do cenário.')){
      if(selectedRoomId===room.id)setSelectedRoomId('');
    }
  }
  function resetToActual(){
    if(!scenario||!window.confirm('Recriar esta proposta com a planta atual? Os móveis serão preservados no histórico, e as áreas externas independentes continuarão nesta proposta.'))return;
    if(run(()=>resetScenarioToActual(home,scenario.id,newId(),new Date().toISOString()),'Planta atual copiada. A proposta anterior está no histórico.')){
      setSelectedRoomId(actualRooms[0]?.id??'');setView('tridimensional');
    }
  }
  function restore(revisionId:string){
    if(!scenario||!window.confirm('Restaurar esta versão antiga do cenário? O desenho atual ficará no histórico.'))return;
    if(run(()=>restoreScenarioRevision(home,scenario.id,revisionId,newId(),new Date().toISOString()),'Versão restaurada. A proposta anterior foi preservada.')){
      setSelectedRoomId('');setView('tridimensional');
    }
  }
  return <section className="scenario-workspace panel" aria-label="Cenários do projeto">
    <header className="scenario-heading"><div><span className="eyebrow dark-eyebrow">PLANEJAMENTO ESPACIAL</span><h3>Cenários 2D e 3D</h3>
      <p>Experimente mudanças, crie alternativas e compare com a planta atual. As propostas não alteram sua casa cadastrada.</p></div>
      {(!scenario||view!=='externos')&&<FloatingActions actions={[
        {label:'Criar cenário',disabled:archived,onClick:startNew},
        ...(scenario&&view==='tridimensional'?[{label:'Novo espaço',disabled:archived||scenario.rooms.length>=40,onClick:()=>editRoom()}]:[])
      ]}/>}
    </header>
    {message&&<Feedback tone="success" onDismiss={()=>setMessage('')}>{message}</Feedback>}
    {error&&modal===null&&<Feedback tone="error">{error}</Feedback>}
    {archived&&<Feedback tone="warning">Projeto arquivado: cenários disponíveis apenas para consulta. Reative-o para editar.</Feedback>}
    {!scenario ? <>
      {scenarios.length===0?<EmptyState icon={Layers3} title="Nenhuma proposta criada" description="Use Novo para criar um cenário independente da planta real."/>:<div className="scenario-library"><h4>Escolha uma proposta</h4><div className="scenario-cards">{scenarios.map(item=><article key={item.id} className="scenario-card">
        <div><Layers3 size={19}/><strong>{item.name}</strong></div><p>{item.description||'Proposta sem descrição'}</p>
        <small>{item.rooms.length} cômodo(s) · {(item.outdoorAreas??[]).length} área(s) externa(s) · Atualizado {shortDate(item.updatedAt)}</small>
        <div><button type="button" className="btn btn-outline" onClick={()=>selectScenario(item)}>Abrir proposta</button>
          <button type="button" className="icon-button" disabled={archived} title="Duplicar cenário" aria-label={`Duplicar ${item.name}`} onClick={()=>duplicate(item)}><Copy size={16}/></button>
          <button type="button" className="icon-button danger-hover" disabled={archived} title="Excluir cenário" aria-label={`Excluir ${item.name}`} onClick={()=>removeScene(item)}><Trash2 size={16}/></button>
        </div>
      </article>)}</div></div>}
    </> : <>
      <div className="scenario-selected-bar">
        <button type="button" className="scenario-back" onClick={()=>{setSelectedId(null);setView('tridimensional');}}><ArrowLeft size={16}/>Todas as propostas</button>
        <div><strong>{scenario.name}</strong><small>{scenario.rooms.length} cômodos · {scenario.furniture.length} móveis · {(scenario.outdoorAreas??[]).length} áreas externas · {scenario.revisions.length} versões anteriores</small></div>
        <div className="scenario-actions">
          <button type="button" className="btn btn-outline" disabled={archived} onClick={openRename}><Edit3 size={16}/>Renomear</button>
          <button type="button" className="btn btn-outline" disabled={archived} onClick={()=>duplicate(scenario)}><Copy size={16}/>Duplicar</button>
          <button type="button" className="btn btn-outline" disabled={archived} onClick={resetToActual}><RotateCcw size={16}/>Copiar planta atual</button>
        </div>
      </div>
      <div className="scenario-stats" role="group" aria-label="Diferenças em relação à planta atual">
        <div><span>Cômodos planejados</span><strong>{scenario.rooms.length}</strong></div>
        <div><span>Alterados</span><strong>{comparison?.changed??0}</strong></div>
        <div><span>Adicionados</span><strong>{comparison?.added??0}</strong></div>
        <div><span>Removidos na proposta</span><strong>{comparison?.removed??0}</strong></div>
        <div><span>Áreas externas</span><strong>{(scenario.outdoorAreas??[]).length}</strong></div>
      </div>
      <div className="scenario-view-tabs" role="tablist" aria-label="Modo de visualização do cenário">
        <button type="button" role="tab" aria-selected={view==='tridimensional'} onClick={()=>setView('tridimensional')}><Layers3 size={17}/>Vista 3D</button>
        <button type="button" role="tab" aria-selected={view==='editor'} disabled={!scenario.rooms.length||archived} onClick={()=>setView('editor')}><Grid2X2 size={17}/>Editar 2D</button>
        <button type="button" role="tab" aria-selected={view==='interiores'} disabled={!scenario.rooms.length} onClick={()=>setView('interiores')}><Layers3 size={17}/>Interiores 3D</button>
        <button type="button" role="tab" aria-selected={view==='externos'} onClick={()=>setView('externos')}><Layers3 size={17}/>Áreas externas</button>
        <button type="button" role="tab" aria-selected={view==='comparar'} onClick={()=>setView('comparar')}><GitCompareArrows size={17}/>Antes e depois</button>
      </div>
      {view==='externos' ? <OutdoorWorkspace home={home} scenario={scenario} archived={archived} onCreateScenario={startNew} onChange={onChange} onOpenTasks={onOpenTasks} onOpenBudget={onOpenBudget}/>
      :view==='editor' ? <div className="scenario-embedded-editor">
        <p className="scenario-editor-notice">Editando a proposta <strong>{scenario.name}</strong>. Salvar aqui não altera a planta real.</p>
        <PlanEditor key={scenario.id+':'+scenario.updatedAt} rooms={scenario.rooms} selectedRoomId={activeRoomId}
          onSelect={setSelectedRoomId}
          onSave={room=>{
            const updated=changeScenarioRoom(home,scenario.id,room,newId(),new Date().toISOString());
            onChange(updated);
            setError('');
            setMessage('Geometria salva somente nesta proposta.');
          }}
          onBack={()=>setView('tridimensional')}/>
      </div> : view==='interiores'
        ?<InteriorWorkspace home={home} scenario={scenario} archived={archived} onChange={onChange}/>
        : view==='comparar'?<div className="scenario-compare" aria-label="Comparação antes e depois">
        <div className="scenario-compare-column"><h4>Antes · planta real</h4><p>Dados atuais da residência (somente leitura)</p>
          <div className="scenario-compare-map"><PlanMap rooms={actualRooms} label="planta atual"/></div>
          <div className="scenario-viewport">{actualRooms.length?<HouseModel rooms={actualRooms} selectedRoomId="" selectedWall="leste" onSelect={()=>{}}/>:<div className="scenario-placeholder">Não há cômodos reais associados a este projeto.</div>}</div>
        </div>
        <div className="scenario-compare-column"><h4>Depois · {scenario.name}</h4><p>Versão independente em planejamento</p>
          <div className="scenario-compare-map"><PlanMap rooms={scenario.rooms} label={scenario.name} furniture={scenario.furniture}/></div>
          <div className="scenario-viewport">{scenario.rooms.length?<HouseModel rooms={scenario.rooms} furniture={scenario.furniture} selectedRoomId={activeRoomId} selectedWall={selectedWall} onSelect={(id,wall)=>{setSelectedRoomId(id);setSelectedWall(wall);}}/>:<div className="scenario-placeholder">Proposta vazia. Adicione espaços antes de visualizar.</div>}</div>
        </div>
      </div>:<div className="scenario-view-main">
        <div className="scenario-viewport">{scenario.rooms.length?<HouseModel rooms={scenario.rooms} furniture={scenario.furniture} selectedRoomId={activeRoomId}
          selectedWall={selectedWall} onSelect={(id,wall)=>{setSelectedRoomId(id);setSelectedWall(wall);}}/>
          :<div className="scenario-placeholder"><Layers3 size={30}/>Esta proposta está vazia. Adicione um espaço para começar.</div>}</div>
        <div className="scenario-rooms-panel">
          <div><h4>Espaços da proposta</h4></div>
          {scenario.rooms.length?<div className="scenario-room-list">{scenario.rooms.map(room=><div className={activeRoomId===room.id?'is-active':''} key={room.id}>
            <button type="button" className="scenario-room-select" aria-pressed={activeRoomId===room.id} onClick={()=>setSelectedRoomId(room.id)}>
              <DoorOpen size={17}/><span><strong>{room.name}</strong><small>{number(room.width)} × {number(room.length)} × {number(room.height)} m</small></span></button>
            <button type="button" className="icon-button" aria-label={`Editar medidas de ${room.name}`} disabled={archived} onClick={()=>editRoom(room)}><Edit3 size={16}/></button>
            <button type="button" className="icon-button danger-hover" aria-label={`Remover ${room.name} do cenário`} disabled={archived} onClick={()=>removeRoom(room)}><Trash2 size={16}/></button>
          </div>)}</div>:<p>Esta proposta não tem cômodos. Você pode criar um novo espaço para simular uma ampliação.</p>}
          {scenario.rooms.length>0&&!archived&&<button type="button" className="btn btn-outline full" onClick={()=>setView('editor')}><Grid2X2 size={16}/>Editar paredes, contornos, portas e janelas</button>}
        </div>
      </div>}
      <div className="scenario-history">
        <div><History size={18}/><h4>Histórico de versões</h4><span>Até 12 versões anteriores preservadas</span></div>
        {scenario.revisions.length?<ol>{[...scenario.revisions].reverse().map(revision=><li key={revision.id}>
          <span><strong>{revision.label}</strong><small>{shortDate(revision.savedAt)} · {revision.rooms.length} cômodo(s) · {(revision.outdoorAreas??[]).length} área(s) externa(s)</small></span>
          <button type="button" className="btn btn-outline" disabled={archived} onClick={()=>restore(revision.id)}>Restaurar</button>
        </li>)}</ol>:<p>Suas edições de planta aparecerão aqui. Você poderá restaurar uma versão anterior.</p>}
      </div>
    </>}
    {modal==='new'&&<Modal title="Criar cenário" onClose={()=>setModal(null)}>
      <form className="modal-form scenario-form" onSubmit={commitNew}>
        <div className="field"><label htmlFor="scenario-name">Nome da proposta *</label><input id="scenario-name" required minLength={2} maxLength={120}
          value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Sala moderna — opção A"/></div>
        <fieldset><legend>Como começar?</legend>
          <label><input type="radio" name="scenario-mode" value="projeto" checked={newMode==='projeto'} onChange={()=>setNewMode('projeto')}/><span>Copiar cômodos atuais vinculados ao projeto ({actualRooms.length})</span></label>
          <label><input type="radio" name="scenario-mode" value="vazio" checked={newMode==='vazio'} onChange={()=>setNewMode('vazio')}/><span>Começar uma proposta em branco</span></label>
        </fieldset>
        <p className="form-hint">O resultado é uma cópia independente. A planta atual nunca será modificada por este cenário.</p>
        {error&&<Feedback tone="error">{error}</Feedback>}
        <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={()=>setModal(null)}>Cancelar</button><button type="submit" className="btn btn-primary"><Check size={16}/>Criar proposta</button></div>
      </form>
    </Modal>}
    {modal==='rename'&&<Modal title="Editar proposta" onClose={()=>setModal(null)}>
      <form className="modal-form scenario-form" onSubmit={commitRename}>
        <div className="field"><label htmlFor="scenario-name">Nome da proposta *</label><input id="scenario-name" required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></div>
        <div className="field"><label htmlFor="scenario-description">Descrição</label><textarea id="scenario-description" maxLength={4000} rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></div>
        {error&&<Feedback tone="error">{error}</Feedback>}
        <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={()=>setModal(null)}>Cancelar</button><button type="submit" className="btn btn-primary">Salvar proposta</button></div>
      </form>
    </Modal>}
    {modal==='room'&&<Modal title={roomEditId?'Editar espaço da proposta':'Novo espaço planejado'} onClose={()=>setModal(null)}>
      <form className="modal-form scenario-form" onSubmit={commitRoom}>
        <p className="form-hint">As medidas são para visualização e planejamento. Confirme dimensões reais antes de executar uma obra.</p>
        <div className="field"><label htmlFor="scene-room-name">Nome do espaço *</label><input id="scene-room-name" required maxLength={180} value={roomFields.name} onChange={e=>setRoomFields(p=>({...p,name:e.target.value}))}/></div>
        <div className="form-row three">{([['width','Largura (m)'],['length','Comprimento (m)'],['height','Altura (m)']] as const).map(([key,label])=><div className="field" key={key}>
          <label htmlFor={`scene-room-${key}`}>{label}</label><input id={`scene-room-${key}`} type="number" required min=".1" max="100" step=".01" value={roomFields[key]} onChange={e=>setRoomFields(p=>({...p,[key]:Number(e.target.value)}))}/></div>)}</div>
        <Disclosure title="Posição na planta" summary="Opcional"><div className="form-row">{(['x','z'] as const).map(key=><div className="field" key={key}><label htmlFor={`scene-room-${key}`}>Posição {key.toUpperCase()} (m)</label>
          <input id={`scene-room-${key}`} type="number" required min="-100" max="100" step=".01" value={roomFields[key]} onChange={e=>setRoomFields(p=>({...p,[key]:Number(e.target.value)}))}/></div>)}</div></Disclosure>
        {error&&<Feedback tone="error">{error}</Feedback>}
        <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={()=>setModal(null)}>Cancelar</button><button type="submit" className="btn btn-primary"><Check size={16}/>Salvar espaço</button></div>
      </form>
    </Modal>}
  </section>;
}
