import FloatingActions from '../../shared/FloatingActions';
import { useState, type FormEvent } from 'react';
import {
  Check, Edit3, FilePlus2, Link2, Receipt, ShoppingBasket,
  Trash2, Wrench,
} from 'lucide-react';
import type { HomeData, Project, ProjectTask, Purchase, PurchaseStatus } from '../../types';
import { money, newId } from '../../data';
import Modal from '../../shared/Modal';
import PurchaseEditor from './PurchaseEditor';
import {
  addPurchaseQuote, centsFromText, centsInput, changePurchaseStatus, currentStatus,
  deletePurchase, projectBudget, PURCHASE_STATUS_NAMES, removePurchaseQuote,
  savePurchase, setProjectContingency, setServiceCosts, type PurchaseEdit,
} from './budgetDomain';
import './budget.css';

type Props={home:HomeData;project:Project;onChange:(next:HomeData)=>void};
const brl=(cents:number)=>money(cents/100);
const newDraft=(projectId:string):PurchaseEdit=>({
  name:'',category:'Materiais',roomId:'',priority:'media',quantity:1,unitPrice:0,
  purchased:false,status:'preciso',projectId,taskId:undefined,unit:'un.',
  actualUnitPriceCents:null,supplier:'',quotes:[],notes:'',url:'',
});
export default function ProjectBudget({home,project,onChange}:Props){
  const figures=projectBudget(home,project.id);
  const archived=Boolean(project.archivedAt);
  const [editId,setEditId]=useState<string|null>(null);
  const [draft,setDraft]=useState<PurchaseEdit>(()=>newDraft(project.id));
  const [costId,setCostId]=useState<string|null>(null);
  const [estimateInput,setEstimateInput]=useState('');
  const [actualInput,setActualInput]=useState('');
  const [quoteId,setQuoteId]=useState<string|null>(null);
  const [supplier,setSupplier]=useState('');
  const [quotedPrice,setQuotedPrice]=useState('');
  const [quoteUrl,setQuoteUrl]=useState('');
  const [reserve,setReserve]=useState(String(project.contingencyPercent??0));
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [statusFilter,setStatusFilter]=useState<'todos'|'pendentes'|'comprados'>('todos');

  function apply(work:()=>HomeData,msg:string){
    try{onChange(work());setNotice(msg);setError('');}
    catch(failure){setError(failure instanceof Error?failure.message:'Não foi possível salvar.');}
  }
  function openPurchase(item?:Purchase){
    if(archived)return;
    if(item){const {id: _id,createdAt: _createdAt,...rest}=item;void _id;void _createdAt;setDraft(rest);setEditId(item.id);}
    else{setDraft(newDraft(project.id));setEditId('new');}
    setError('');
  }
  function commitPurchase(e:FormEvent){
    e.preventDefault();
    try{
      const result=savePurchase(home,{...draft,projectId:project.id},editId==='new'?null:editId,new Date().toISOString(),newId());
      onChange(result);setEditId(null);setNotice('Compra salva. Aguarde a sincronização na nuvem.');setError('');
    }catch(failure){setError(failure instanceof Error?failure.message:'Não foi possível salvar o item.');}
  }
  function removeItem(item:Purchase){
    if(!window.confirm(`Excluir a compra "${item.name}"? O item desaparecerá também da lista global.`))return;
    apply(()=>deletePurchase(home,item.id),'Compra excluída da lista geral e do projeto.');
  }
  function openCosts(task:ProjectTask){
    if(archived)return;
    setCostId(task.id);setEstimateInput(centsInput(task.estimatedCostCents));
    setActualInput(centsInput(task.actualCostCents));setError('');
  }
  function commitCost(e:FormEvent){
    e.preventDefault();
    try{
      const result=setServiceCosts(home,costId!,centsFromText(estimateInput),centsFromText(actualInput),new Date().toISOString());
      onChange(result);setCostId(null);setError('');setNotice('Custos do serviço atualizados.');
    }catch(failure){setError(failure instanceof Error?failure.message:'Não foi possível salvar os custos.');}
  }
  function openQuotes(item:Purchase){setQuoteId(item.id);setSupplier('');setQuotedPrice('');setQuoteUrl('');setError('');}
  function addQuote(e:FormEvent){
    e.preventDefault();
    try{
      const price=centsFromText(quotedPrice);
      if(price===null)throw new Error('Informe o valor cotado.');
      const next=addPurchaseQuote(home,quoteId!,{
        id:newId(),supplier:supplier.trim(),unitPriceCents:price,
        url:quoteUrl.trim(),createdAt:new Date().toISOString(),
      });
      onChange(next);setSupplier('');setQuotedPrice('');setQuoteUrl('');setNotice('Cotação registrada.');setError('');
    }catch(failure){setError(failure instanceof Error?failure.message:'Não foi possível adicionar cotação.');}
  }
  const visiblePurchases=figures.purchases.filter(item=>statusFilter==='todos'
    ||(statusFilter==='comprados'?item.purchased:!item.purchased));
  const selectedCostTask=figures.tasks.find(task=>task.id===costId);
  const selectedQuotePurchase=home.purchases.find(item=>item.id===quoteId);
  return <section className="budget-workspace panel" aria-label="Compras e orçamento do projeto">
    <header className="budget-head"><div><span className="eyebrow dark-eyebrow">CUSTOS E MATERIAIS</span><h3>Compras e orçamento</h3>
      <p>Itens vinculados à lista geral. Materiais, serviços e gastos confirmados aparecem separadamente.</p></div>
      <FloatingActions actions={[{label:'Adicionar compra',disabled:archived,onClick:()=>openPurchase()}]}/>
    </header>
    {notice&&<div role="status" className="budget-feedback">{notice}<button type="button" aria-label="Fechar mensagem" onClick={()=>setNotice('')}>×</button></div>}
    {error&&!editId&&!costId&&!quoteId&&<p className="budget-error" role="alert">{error}</p>}
    <div className="budget-overview">
      <div><span>Materiais previstos</span><strong>{brl(figures.materialsCents)}</strong></div>
      <div><span>Serviços previstos</span><strong>{brl(figures.servicesCents)}</strong></div>
      <div><span>Reserva para imprevistos</span><strong>{brl(figures.reserveCents)}</strong></div>
      <div className="budget-total"><span>Total projetado</span><strong>{brl(figures.forecastCents)}</strong></div>
    </div>
    <div className="budget-track">
      <div><span><Receipt size={17}/>Gasto efetivamente informado</span>
        <strong>{brl(figures.registeredCents)}</strong></div>
      <p>{figures.confirmedItems
        ?`Calculado com ${figures.confirmedItems} registro(s) de valor real. Itens comprados sem preço pago ainda não entram nesse total.`
        :'Nenhum gasto real informado. Marcar como comprado não significa confirmar o valor pago.'}</p>
      {figures.targetCents!==null&&<div className="budget-target"><span>Meta do projeto: {brl(figures.targetCents)}</span>
        <strong className={figures.balanceCents!<0?'budget-over':''}>{figures.balanceCents!<0?'Projeção acima da meta: ':'Margem da meta: '}{brl(Math.abs(figures.balanceCents!))}</strong></div>}
    </div>
    <div className="budget-reserve"><label htmlFor="budget-contingency">Reserva para imprevistos (%)</label><div><input id="budget-contingency" type="number" min="0" max="50" step="1" value={reserve} disabled={archived}
      onChange={e=>setReserve(e.target.value)}/><button type="button" className="btn btn-outline" disabled={archived} onClick={()=>apply(()=>setProjectContingency(home,project.id,Number(reserve),new Date().toISOString()),'Reserva atualizada.')}>Aplicar reserva</button></div>
      <small>Percentual sobre materiais e serviços previstos. Não representa um gasto realizado.</small></div>
    <div className="budget-section-title"><div><ShoppingBasket size={19}/><h4>Materiais e compras</h4><span>{figures.purchases.length} itens · {figures.pendingCount} pendentes</span></div>
      <label>Visualizar<select aria-label="Filtrar compras do projeto" value={statusFilter} onChange={e=>setStatusFilter(e.target.value as typeof statusFilter)}><option value="todos">Todos</option><option value="pendentes">Pendentes</option><option value="comprados">Comprados</option></select></label></div>
    {!visiblePurchases.length?<div className="budget-empty"><ShoppingBasket size={27}/><p>{figures.purchases.length?'Nenhuma compra corresponde a este filtro.':'Ainda não há compras vinculadas ao projeto. Você pode cadastrar materiais, móveis e equipamentos aqui.'}</p></div>:
      <div className="budget-item-list">{visiblePurchases.map(item=><article key={item.id} className="budget-item">
        <div className="budget-item-header"><div><h5>{item.name}</h5><span>{item.category} · {item.quantity} {item.unit??'un.'} · {item.supplier||'Fornecedor não definido'}</span></div>
          <select disabled={archived} aria-label={`Situação de compra de ${item.name}`} value={currentStatus(item)}
            onChange={e=>apply(()=>changePurchaseStatus(home,item.id,e.target.value as PurchaseStatus),'Situação da compra atualizada.')}>
            {Object.entries(PURCHASE_STATUS_NAMES).map(([value,label])=><option value={value} key={value}>{label}</option>)}
          </select>
        </div>
        <div className="budget-item-bottom"><div><strong>Previsto: {brl(Math.round(item.unitPrice*100*item.quantity))}</strong>
          <span>{item.purchased?(item.actualUnitPriceCents==null?'Pago não informado':`Pago: ${brl(Math.round(item.actualUnitPriceCents*item.quantity))}`):'Ainda não comprado'}</span>
          {item.taskId&&<small>Tarefa: {home.workTasks.find(t=>t.id===item.taskId)?.title||'—'}</small>}</div>
          <div className="budget-item-actions">
            <button type="button" className="btn btn-outline" onClick={()=>openQuotes(item)}><Receipt size={14}/>Cotações ({item.quotes?.length??0})</button>
            <button type="button" className="icon-button" aria-label={`Editar compra ${item.name}`} disabled={archived} onClick={()=>openPurchase(item)}><Edit3 size={16}/></button>
            <button type="button" className="icon-button danger-hover" aria-label={`Excluir compra ${item.name}`} disabled={archived} onClick={()=>removeItem(item)}><Trash2 size={16}/></button>
          </div></div>
      </article>)}</div>}
    <div className="budget-section-title"><div><Wrench size={19}/><h4>Custos de serviços</h4><span>Não inclua materiais aqui para evitar somar duas vezes.</span></div></div>
    {figures.tasks.length?<div className="budget-task-list">{figures.tasks.map(task=><div className="budget-task-row" key={task.id}>
      <div><strong>{task.title}</strong><span>Previsto: {task.estimatedCostCents==null?'Não informado':brl(task.estimatedCostCents)} · Real: {task.actualCostCents==null?'Não informado':brl(task.actualCostCents)}</span></div>
      <button type="button" className="btn btn-outline" disabled={archived} onClick={()=>openCosts(task)}><Edit3 size={15}/>Custos</button></div>)}</div>
      :<div className="budget-empty"><p>Cadastre serviços na seção Tarefas. Depois registre aqui a estimativa e o valor realizado da mão de obra.</p></div>}
    <p className="budget-footnote">O orçamento é uma estimativa informada por você. Não inclui cálculo estrutural, preços atualizados automaticamente ou impostos não cadastrados.</p>
    {editId!==null&&<Modal title={editId==='new'?'Adicionar compra ao projeto':'Editar compra do projeto'} onClose={()=>setEditId(null)}>
      <PurchaseEditor home={home} draft={draft} setDraft={setDraft} lockedProjectId={project.id} onSubmit={commitPurchase} onCancel={()=>setEditId(null)}/>
      {error&&<p className="budget-error" role="alert">{error}</p>}
    </Modal>}
    {selectedCostTask&&<Modal title={`Custos do serviço: ${selectedCostTask.title}`} onClose={()=>setCostId(null)}>
      <form className="modal-form budget-cost-form" onSubmit={commitCost}>
        <p className="form-hint">Preencha somente mão de obra e serviços. Os materiais são cadastrados como compras, sem duplicar valores.</p>
        <div className="field"><label htmlFor="service-forecast">Custo previsto (R$)</label><input id="service-forecast" inputMode="decimal" value={estimateInput} onChange={e=>setEstimateInput(e.target.value)} placeholder="Ex.: 1500,00"/></div>
        <div className="field"><label htmlFor="service-real">Custo efetivamente pago (R$)</label><input id="service-real" inputMode="decimal" value={actualInput} onChange={e=>setActualInput(e.target.value)} placeholder="Ex.: 1350,00"/></div>
        {error&&<p className="budget-error" role="alert">{error}</p>}
        <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={()=>setCostId(null)}>Cancelar</button><button type="submit" className="btn btn-primary"><Check size={16}/>Salvar custos</button></div>
      </form>
    </Modal>}
    {selectedQuotePurchase&&<Modal title={`Cotações: ${selectedQuotePurchase.name}`} onClose={()=>setQuoteId(null)}>
      <div className="budget-quotes">
        {(selectedQuotePurchase.quotes??[]).length ? selectedQuotePurchase.quotes!.map(quote=><div className="budget-quote" key={quote.id}>
          <div><strong>{quote.supplier}</strong><span>{brl(quote.unitPriceCents)} / {selectedQuotePurchase.unit??'un.'}</span>
            {quote.url&&<a href={quote.url} target="_blank" rel="noopener noreferrer"><Link2 size={14}/>Abrir cotação</a>}</div>
          <button type="button" className="icon-button danger-hover" disabled={archived} aria-label={`Excluir cotação de ${quote.supplier}`}
            onClick={()=>apply(()=>removePurchaseQuote(home,selectedQuotePurchase.id,quote.id),'Cotação excluída.')}><Trash2 size={16}/></button>
        </div>):<p>Ainda não há cotações cadastradas.</p>}
      </div>
      {!archived&&<form className="modal-form budget-quote-form" onSubmit={addQuote}>
        <div className="field"><label htmlFor="quote-supplier">Fornecedor *</label><input id="quote-supplier" required maxLength={180} value={supplier} onChange={e=>setSupplier(e.target.value)}/></div>
        <div className="field"><label htmlFor="quote-price">Preço unitário cotado (R$) *</label><input id="quote-price" required inputMode="decimal" value={quotedPrice} onChange={e=>setQuotedPrice(e.target.value)} placeholder="Ex.: 84,90"/></div>
        <div className="field"><label htmlFor="quote-url">Link da cotação (opcional)</label><input id="quote-url" type="url" value={quoteUrl} onChange={e=>setQuoteUrl(e.target.value)} placeholder="https://..."/></div>
        {error&&<p className="budget-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary"><FilePlus2 size={16}/>Adicionar cotação</button>
      </form>}
    </Modal>}
  </section>;
}
