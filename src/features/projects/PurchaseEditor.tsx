import NumericInput from '../../shared/NumericInput';
import {Feedback} from '../../shared/UiState';
import Disclosure from '../../shared/Disclosure';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Check } from 'lucide-react';
import type { HomeData, Priority, PurchaseStatus } from '../../types';
import { priorityNames } from '../../data';
import { currentStatus, PURCHASE_STATUS_NAMES, PURCHASE_UNITS, type PurchaseEdit } from './budgetDomain';

type Props={
  home:HomeData;
  draft:PurchaseEdit;
  setDraft:Dispatch<SetStateAction<PurchaseEdit>>;
  onSubmit:(e:FormEvent)=>void;
  onCancel:()=>void;
  lockedProjectId?:string;
  error?:string;
};
export default function PurchaseEditor({home,draft,setDraft,onSubmit,onCancel,lockedProjectId,error}:Props){
  const activeProjectId=lockedProjectId??draft.projectId??'';
  const project=home.projects.find(item=>item.id===activeProjectId);
  const rooms=project
    ?home.rooms.filter(room=>project.spaceIds.some(id=>home.spaces.some(space=>space.id===id&&space.roomId===room.id)))
    :home.rooms;
  const tasks=home.workTasks.filter(task=>task.projectId===activeProjectId);
  const setStatus=(status:PurchaseStatus)=>setDraft(p=>({...p,status,purchased:['comprado','recebido','instalado'].includes(status)}));
  const categories=Array.from(new Set(home.purchases.map(item=>item.category)));
  return <form onSubmit={onSubmit} className="modal-form purchase-editor">
    <div className="field"><label htmlFor="p-name">Nome do item *</label><input id="p-name" autoComplete="off" required maxLength={180} placeholder="Ex.: Tinta, sofá, madeira para deck" value={draft.name} onChange={e=>setDraft(p=>({...p,name:e.target.value}))}/></div>
    <div className="form-row">
      <div className="field"><label htmlFor="p-category">Categoria (livre) *</label><input id="p-category" required list="category-suggestions" value={draft.category} onChange={e=>setDraft(p=>({...p,category:e.target.value}))}/><datalist id="category-suggestions">{['Móveis','Pintura','Construção','Ferramentas','Elétrica','Hidráulica','Decoração','Outros',...categories].map((c,i)=><option key={i} value={c}/>)}</datalist></div>
      <div className="field"><label htmlFor="p-priority">Prioridade</label><select id="p-priority" value={draft.priority} onChange={e=>setDraft(p=>({...p,priority:e.target.value as Priority}))}>{Object.entries(priorityNames).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></div>
    </div>
    <div className="form-row three">
      <div className="field"><label htmlFor="p-qty">Quantidade</label><NumericInput id="p-qty" inputMode="decimal" min=".01" step="any" value={draft.quantity} onChange={e=>setDraft(p=>({...p,quantity:Number(e.target.value)}))} required/></div>
      <div className="field"><label htmlFor="p-unit">Unidade</label><input id="p-unit" list="purchase-units" maxLength={32} value={draft.unit??'un.'} onChange={e=>setDraft(p=>({...p,unit:e.target.value}))}/><datalist id="purchase-units">{PURCHASE_UNITS.map(unit=><option value={unit} key={unit}/>)}</datalist></div>
      <div className="field"><label htmlFor="p-price">Preço unitário (R$)</label><NumericInput id="p-price" inputMode="decimal" step=".01" min="0" value={draft.unitPrice} onChange={e=>setDraft(p=>({...p,unitPrice:Number(e.target.value)}))}/></div>
    </div>
    <Disclosure title="Vínculos" summary={project?.name??(draft.roomId?'Cômodo vinculado':'Opcional')}>
    <div className="form-row">
      <div className="field"><label htmlFor="p-project">Projeto (opcional)</label><select id="p-project" value={activeProjectId} disabled={Boolean(lockedProjectId)} onChange={e=>setDraft(p=>({...p,projectId:e.target.value||undefined,taskId:undefined,roomId:''}))}>
        <option value="">Compra geral, sem projeto</option>{home.projects.filter(p=>!p.archivedAt||p.id===activeProjectId).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select></div>
      <div className="field"><label htmlFor="p-room">Cômodo (opcional)</label><select id="p-room" value={draft.roomId} onChange={e=>setDraft(p=>({...p,roomId:e.target.value}))}>
        <option value="">Não vinculado</option>{rooms.map(r=><option value={r.id} key={r.id}>{r.name}</option>)}
      </select></div>
    </div>
    {Boolean(activeProjectId)&&<div className="field"><label htmlFor="p-task">Tarefa relacionada (opcional)</label><select id="p-task" value={draft.taskId??''} onChange={e=>setDraft(p=>({...p,taskId:e.target.value||undefined}))}>
      <option value="">Nenhuma tarefa</option>{tasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}
    </select></div>}
    {Boolean(activeProjectId)&&<div className="field"><label htmlFor="p-phase">Etapa do projeto (opcional)</label><input id="p-phase" maxLength={80} list="purchase-phases" value={draft.phase??''} onChange={e=>setDraft(p=>({...p,phase:e.target.value}))} placeholder="Em branco: herda a etapa da tarefa"/>
      <datalist id="purchase-phases">{Array.from(new Set(tasks.map(t=>t.phase).filter(Boolean))).map(phase=><option key={phase} value={phase}/>)}</datalist></div>}
    </Disclosure>
    <Disclosure title="Pagamento e fornecedor" summary={draft.actualUnitPriceCents!=null?'Valor pago informado':'Opcional'}>
    <div className="form-row">
      <div className="field"><label htmlFor="p-status">Situação da compra</label><select id="p-status" value={draft.status??currentStatus({...draft,id:'',createdAt:''})} onChange={e=>setStatus(e.target.value as PurchaseStatus)}>
        {Object.entries(PURCHASE_STATUS_NAMES).map(([v,l])=><option value={v} key={v}>{l}</option>)}
      </select></div>
      <div className="field"><label htmlFor="p-actual">Preço unitário pago (R$)</label><NumericInput id="p-actual" inputMode="decimal" min="0" step=".01" placeholder="Ainda não informado"
        value={draft.actualUnitPriceCents==null?'':draft.actualUnitPriceCents/100} onChange={e=>setDraft(p=>({...p,actualUnitPriceCents:e.target.value===''?null:Math.round(Number(e.target.value)*100)}))}/>
        <small>Opcional. Sem esse valor, a compra não será contabilizada como gasto confirmado.</small></div>
    </div>
    <div className="field"><label htmlFor="p-supplier">Fornecedor (opcional)</label><input id="p-supplier" maxLength={180} value={draft.supplier??''} onChange={e=>setDraft(p=>({...p,supplier:e.target.value}))}/></div>
    </Disclosure>
    <Disclosure title="Observações e referência" summary={draft.notes||draft.url?'Preenchido':'Opcional'}>
    <div className="field"><label htmlFor="p-url">Link de referência (opcional)</label><input id="p-url" type="url" placeholder="https://..." value={draft.url} onChange={e=>setDraft(p=>({...p,url:e.target.value}))}/></div>
    <div className="field"><label htmlFor="p-notes">Observações</label><textarea id="p-notes" rows={3} value={draft.notes} onChange={e=>setDraft(p=>({...p,notes:e.target.value}))}/></div>
    </Disclosure>
    {error&&<Feedback tone="error">{error}</Feedback>}
    <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={onCancel}>Cancelar</button><button type="submit" className="btn btn-primary"><Check size={17}/>Salvar item</button></div>
  </form>;
}
