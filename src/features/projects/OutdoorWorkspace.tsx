import NumericInput from '../../shared/NumericInput';
import {DeferredView} from '../../shared/DeferredView';
import {Feedback} from '../../shared/UiState';
import FloatingActions from '../../shared/FloatingActions';
import Modal from '../../shared/Modal';
import {useState,type FormEvent} from 'react';
import {Check,Edit3,Plus,Trash2} from 'lucide-react';
import type {HomeData,ProjectScenario,ScenarioOutdoorArea,PlanPoint} from '../../types';
import {newId} from '../../data';
import {lazy} from 'react';
const OutdoorModel=lazy(()=>import('../../plan/OutdoorModel'));
import {addScenarioOutdoorArea,removeScenarioOutdoorArea,updateScenarioOutdoorArea} from './scenarioDomain';
import {newOutdoorArea,outlinePreset,outdoorAreaSquareMeters,outdoorPerimeter,
  outdoorEdges,OUTDOOR_FINISHES} from './outdoorGeometry';
import './outdoors.css';
type Props={home:HomeData;scenario:ProjectScenario;archived:boolean;onCreateScenario:()=>void;onChange:(next:HomeData)=>void;
  onOpenTasks:()=>void;onOpenBudget:()=>void};
const format=(n:number)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(n);
function OutlineMap({area}:{area:ScenarioOutdoorArea}){
  const xs=area.outline.map(p=>p.x),zs=area.outline.map(p=>p.z);
  const x=Math.min(...xs)-.8,z=Math.min(...zs)-.8;
  const w=Math.max(3,Math.max(...xs)-Math.min(...xs)+1.6);
  const h=Math.max(3,Math.max(...zs)-Math.min(...zs)+1.6);
  const edges=outdoorEdges(area.outline);
  return <svg className="outdoor-plan-svg" viewBox={[x,z,w,h].join(' ')} role="img"
    aria-label={'Planta 2D da área externa '+area.name}>
    <polygon points={area.outline.map(p=>p.x+','+p.z).join(' ')}
      fill={OUTDOOR_FINISHES[area.finish].color} stroke="#426e9e" strokeWidth=".06"/>
    {area.railingEdges.map(i=><line key={i} x1={edges[i].from.x} y1={edges[i].from.z}
      x2={edges[i].to.x} y2={edges[i].to.z} stroke="#1c426e" strokeWidth=".12"
      strokeDasharray=".18 .07"/>)}
    {area.stepsEdge!==null&&<circle
      cx={(edges[area.stepsEdge].from.x+edges[area.stepsEdge].to.x)/2}
      cy={(edges[area.stepsEdge].from.z+edges[area.stepsEdge].to.z)/2}
      r=".17" fill="#e9f5ff" stroke="#1d528a" strokeWidth=".06"/>}
    {area.outline.map((p,i)=><g key={i}><circle cx={p.x} cy={p.z} r=".10" fill="#174e8a"/>
      <text x={p.x+.13} y={p.z-.13} fontSize=".30" fill="#184b80">{i+1}</text></g>)}
  </svg>;
}
export default function OutdoorWorkspace({home,scenario,archived,onCreateScenario,onChange,onOpenTasks,onOpenBudget}:Props){
  const areas=scenario.outdoorAreas??[];
  const [selectedId,setSelectedId]=useState('');
  const selected=areas.find(a=>a.id===selectedId)??areas[0]??null;
  const [draft,setDraft]=useState<ScenarioOutdoorArea|null>(null);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const tasks=home.workTasks.filter(task=>task.projectId===scenario.projectId);
  function edit(area?:ScenarioOutdoorArea){
    if(archived)return;
    setDraft(structuredClone(area??newOutdoorArea(newId())));
    setError('');setNotice('');
  }
  function change(props:Partial<ScenarioOutdoorArea>){setDraft(old=>old?{...old,...props}:old);}
  function vertex(index:number,key:keyof PlanPoint,value:number){
    setDraft(old=>old?{...old,outline:old.outline.map((p,i)=>i===index?{...p,[key]:value}:p)}:old);
  }
  function save(e:FormEvent){
    e.preventDefault();if(!draft)return;
    try{
      const existing=areas.some(a=>a.id===draft.id);
      const next=existing?updateScenarioOutdoorArea(home,scenario.id,draft,newId(),new Date().toISOString())
        :addScenarioOutdoorArea(home,scenario.id,draft,newId(),new Date().toISOString());
      onChange(next);setSelectedId(draft.id);setDraft(null);setError('');
      setNotice('Área externa registrada na proposta. Aguarde a sincronização.');
    }catch(problem){setError(problem instanceof Error?problem.message:'Não foi possível salvar a área.');}
  }
  function remove(){
    if(!selected||archived||!window.confirm('Excluir a área externa '+selected.name+'? A versão anterior ficará no histórico.'))return;
    try{
      onChange(removeScenarioOutdoorArea(home,scenario.id,selected.id,newId(),new Date().toISOString()));
      setSelectedId('');setDraft(null);setError('');setNotice('Área removida da proposta.');
    }catch(problem){setError(problem instanceof Error?problem.message:'Não foi possível excluir a área.');}
  }
  return <section className="outdoor-workspace" aria-label="Planejamento de espaços externos">
    <header className="outdoor-heading"><div><h4>Espaços externos e deck</h4>
      <p>Defina o contorno e a altura da área planejada. Este espaço não exige um cômodo interno.</p></div>
      <FloatingActions actions={[
        {label:'Nova área externa',disabled:archived||areas.length>=12,onClick:()=>edit()},
        {label:'Criar cenário',disabled:archived,onClick:onCreateScenario}
      ]}/></header>
    <p className="outdoor-notice">Prévia ilustrativa, não é projeto estrutural. A área calculada não determina materiais, resistência ou segurança da obra.</p>
    {notice&&<Feedback tone="success" onDismiss={()=>setNotice('')}>{notice}</Feedback>}
    {error&&!draft&&<Feedback tone="error">{error}</Feedback>}
    {areas.length>0&&<div className="outdoor-toolbar">
      <label htmlFor="outdoor-select">Área planejada
        <select id="outdoor-select" value={selected?.id??''}
          onChange={e=>{setSelectedId(e.target.value);setDraft(null);}}>
          {areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
        </select></label>
      <button type="button" className="btn btn-outline" disabled={archived} onClick={()=>selected&&edit(selected)}><Edit3 size={15}/>Editar</button>
      <button type="button" className="btn btn-outline" disabled={archived} onClick={remove}><Trash2 size={15}/>Excluir</button>
    </div>}
    {!selected&&!draft&&<div className="outdoor-empty"><h5>Nenhuma área externa planejada</h5>
      <p>Crie um deck, varanda ou pátio sem adicionar cômodos reais.</p>
    </div>}
    {draft&&<Modal title={areas.some(a=>a.id===draft.id)?'Editar área externa':'Nova área externa'} onClose={()=>{setDraft(null);setError('');}}>
    <form className="outdoor-form modal-form" onSubmit={save}>
      <div className="outdoor-fields">
        <label className="outdoor-wide">Nome<input required minLength={2} maxLength={120}
          value={draft.name} onChange={e=>change({name:e.target.value})}/></label>
        <label>Posição X (m)<NumericInput required min="-100" max="100" step=".01"
          value={draft.x} onChange={e=>change({x:Number(e.target.value)})}/></label>
        <label>Posição Z (m)<NumericInput required min="-100" max="100" step=".01"
          value={draft.z} onChange={e=>change({z:Number(e.target.value)})}/></label>
        <label>Nível do piso (m)<NumericInput required min="-2" max="5" step=".01"
          value={draft.level} onChange={e=>change({level:Number(e.target.value)})}/></label>
        <label>Espessura ilustrativa (m)<NumericInput required min=".08" max=".6" step=".01"
          value={draft.thickness} onChange={e=>change({thickness:Number(e.target.value)})}/></label>
        <label className="outdoor-wide">Acabamento visual<select value={draft.finish}
          onChange={e=>change({finish:e.target.value as ScenarioOutdoorArea['finish']})}>
          {Object.entries(OUTDOOR_FINISHES).map(([value,item])=><option key={value} value={value}>{item.label}</option>)}
        </select></label>
      </div>
      <fieldset className="outdoor-outline-editor"><legend>Contorno (metros)</legend>
        <div className="outdoor-preset-actions">
          <button type="button" className="btn btn-outline" onClick={()=>change({outline:outlinePreset('retangular'),railingEdges:[],stepsEdge:null})}>Retângulo 4 × 3 m</button>
          <button type="button" className="btn btn-outline" onClick={()=>change({outline:outlinePreset('L'),railingEdges:[],stepsEdge:null})}>Formato L</button>
        </div>
        <p>Edite os vértices na ordem do contorno. Valores são verificados ao salvar.</p>
        <div className="outdoor-vertices">{draft.outline.map((p,i)=><div className="outdoor-vertex" key={i}>
          <strong>Vértice {i+1}</strong>
          <label>X (m)<NumericInput required step=".01" min="-100" max="100"
            aria-label={'Vértice '+(i+1)+' X (m)'} value={p.x}
            onChange={e=>vertex(i,'x',Number(e.target.value))}/></label>
          <label>Z (m)<NumericInput required step=".01" min="-100" max="100"
            aria-label={'Vértice '+(i+1)+' Z (m)'} value={p.z}
            onChange={e=>vertex(i,'z',Number(e.target.value))}/></label>
          <button type="button" className="btn btn-outline" disabled={draft.outline.length<=3}
            aria-label={'Remover vértice '+(i+1)}
            onClick={()=>change({outline:draft.outline.filter((_,j)=>j!==i),railingEdges:[],stepsEdge:null})}><Trash2 size={14}/></button>
        </div>)}</div>
        <button type="button" className="btn btn-outline" disabled={draft.outline.length>=16}
          onClick={()=>{
            const first=draft.outline[0],last=draft.outline[draft.outline.length-1];
            change({outline:[...draft.outline,{x:(last.x+first.x)/2,z:(last.z+first.z)/2}],railingEdges:[],stepsEdge:null});
          }}><Plus size={14}/>Adicionar vértice</button>
      </fieldset>
      <fieldset className="outdoor-accessories"><legend>Acessórios visuais</legend>
        <p>Marque bordas para exibir guarda-corpo ilustrativo.</p>
        <div className="outdoor-edge-options">{draft.outline.map((_,i)=><label key={i}>
          <input type="checkbox" checked={draft.railingEdges.includes(i)}
            onChange={e=>change({railingEdges:e.target.checked?[...draft.railingEdges,i]:draft.railingEdges.filter(n=>n!==i)})}/>
          Borda {i+1}</label>)}</div>
        <label>Degraus ilustrativos na borda<select value={draft.stepsEdge??''}
          onChange={e=>change({stepsEdge:e.target.value===''?null:Number(e.target.value)})}>
          <option value="">Sem degraus</option>
          {draft.outline.map((_,i)=><option key={i} value={i}>Borda {i+1}</option>)}
        </select></label>
      </fieldset>
      {error&&<Feedback tone="error">{error}</Feedback>}
      <div className="outdoor-form-actions"><button type="button" className="btn btn-outline"
        onClick={()=>{setDraft(null);setError('');}}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={archived}><Check size={16}/>Salvar área externa</button></div>
    </form></Modal>}
    {selected&&<div className="outdoor-previews">
      <div className="outdoor-preview"><h5>Planta 2D · {selected.name}</h5>
        <OutlineMap area={selected}/>
        <p>Área: <strong>{format(outdoorAreaSquareMeters(selected.outline))} m²</strong> ·
          Perímetro: {format(outdoorPerimeter(selected.outline))} m</p>
      </div>
      <div className="outdoor-preview"><h5>Visão 3D ilustrativa</h5>
        <div className="outdoor-model"><DeferredView title="Carregando modelo 3D…"><OutdoorModel area={selected}/></DeferredView></div>
        <p>Nível: {format(selected.level)} m · {OUTDOOR_FINISHES[selected.finish].label}</p>
      </div>
    </div>}
    <div className="outdoor-activities"><div><h5>Atividades e custos do projeto</h5>
      <p>{tasks.length} tarefa(s) registradas. Tarefas, compras e orçamento podem existir sem cômodo.</p></div>
      <div><button type="button" className="btn btn-outline" onClick={onOpenTasks}>Gerenciar tarefas</button>
        <button type="button" className="btn btn-outline" onClick={onOpenBudget}>Compras e orçamento</button></div>
    </div>
  </section>;
}
