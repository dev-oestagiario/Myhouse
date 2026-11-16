import type { HomeData, Project, ProjectTask, Purchase, PurchaseQuote, PurchaseStatus } from '../../types';
import { validateHome } from '../../data';

export const PURCHASE_STATUS_NAMES: Record<PurchaseStatus,string> = {
  preciso:'Preciso comprar',pesquisando:'Pesquisando',orcado:'Orçado',comprado:'Comprado',
  recebido:'Recebido',instalado:'Instalado',cancelado:'Cancelado',
};
export const PURCHASE_UNITS=['un.','m','m²','m³','kg','g','L','ml','pacote','caixa','rolo','saco','par','hora','diária'] as const;
const BOUGHT=new Set<PurchaseStatus>(['comprado','recebido','instalado']);

export type PurchaseEdit=Omit<Purchase,'id'|'createdAt'>;
export function currentStatus(item:Purchase):PurchaseStatus {
  return item.status ?? (item.purchased?'comprado':'preciso');
}
export function asCents(real:number):number {
  if(!Number.isFinite(real)||real<0||real>9_999_999.99) throw new Error('Preço unitário inválido.');
  const cents=Math.round(real*100);
  if(Math.abs(cents/100-real)>0.000001)throw new Error('Utilize no máximo duas casas decimais.');
  return cents;
}
export function centsFromText(value:string):number|null {
  const text=value.trim();
  if(!text)return null;
  const normalized=text.replace(',','.');
  if(!/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/.test(normalized))throw new Error('Informe um valor válido em reais, com até duas casas decimais.');
  const [whole,decimal='']=normalized.split('.');
  return Number(whole)*100+Number(decimal.padEnd(2,'0'));
}
export function centsInput(cents?:number|null):string {
  return cents==null?'':(cents/100).toFixed(2).replace('.',',');
}
export function lineCents(unitCents:number,quantity:number):number {
  if(!Number.isFinite(quantity)||quantity<=0||quantity>1_000_000)throw new Error('Quantidade inválida.');
  const total=Math.round(unitCents*quantity);
  if(!Number.isSafeInteger(total))throw new Error('Valor total muito elevado.');
  return total;
}
export function purchasePlannedCents(item:Purchase):number {
  return lineCents(asCents(item.unitPrice),item.quantity);
}
export function purchaseActualCents(item:Purchase):number|null {
  return item.actualUnitPriceCents==null ? null : lineCents(item.actualUnitPriceCents,item.quantity);
}
export function projectBudget(home:HomeData,projectId:string){
  const project=home.projects.find(p=>p.id===projectId);
  if(!project)throw new Error('Projeto não encontrado.');
  const purchases=home.purchases.filter(p=>p.projectId===projectId&&currentStatus(p)!=='cancelado');
  const tasks=home.workTasks.filter(t=>t.projectId===projectId);
  const materialsCents=purchases.reduce((sum,p)=>sum+purchasePlannedCents(p),0);
  const servicesCents=tasks.reduce((sum,t)=>sum+(t.estimatedCostCents??0),0);
  const baseCents=materialsCents+servicesCents;
  const reserveCents=Math.round(baseCents*(project.contingencyPercent??0)/100);
  const forecastCents=baseCents+reserveCents;
  const purchasesActual=purchases.filter(p=>BOUGHT.has(currentStatus(p))&&p.actualUnitPriceCents!=null);
  const servicesActual=tasks.filter(t=>t.actualCostCents!=null);
  const registeredCents=purchasesActual.reduce((sum,p)=>sum+purchaseActualCents(p)!,0)
    +servicesActual.reduce((sum,t)=>sum+t.actualCostCents!,0);
  const confirmedItems=purchasesActual.length+servicesActual.length;
  const pendingCount=purchases.filter(p=>!BOUGHT.has(currentStatus(p))).length;
  return {
    materialsCents,servicesCents,baseCents,reserveCents,forecastCents,
    registeredCents,confirmedItems,pendingCount,purchases,
    tasks, targetCents:project.budgetTargetCents,
    balanceCents:project.budgetTargetCents===null?null:project.budgetTargetCents-forecastCents,
    contingencyPercent:project.contingencyPercent??0,
  };
}
function projectEditable(home:HomeData,id:string):Project {
  const p=home.projects.find(p=>p.id===id);
  if(!p)throw new Error('Projeto não encontrado.');
  if(p.archivedAt)throw new Error('Reative o projeto para editar as compras ou custos.');
  return p;
}
function ensurePurchaseLinks(home:HomeData,item:PurchaseEdit):void {
  if(item.projectId){
    const project=projectEditable(home,item.projectId);
    if(item.taskId && !home.workTasks.some(t=>t.id===item.taskId&&t.projectId===project.id)){
      throw new Error('A tarefa escolhida não pertence ao projeto.');
    }
  }else if(item.taskId)throw new Error('Associe o projeto antes de escolher uma tarefa.');
}
export function savePurchase(home:HomeData,draft:PurchaseEdit,id:string|null,now:string,newId:string):HomeData {
  if(!Number.isFinite(Date.parse(now)))throw new Error('Data inválida.');
  if(!draft.name.trim()||!draft.category.trim())throw new Error('Nome e categoria são obrigatórios.');
  asCents(draft.unitPrice);lineCents(asCents(draft.unitPrice),draft.quantity);
  ensurePurchaseLinks(home,draft);
  const previous=id?home.purchases.find(p=>p.id===id):undefined;
  if(id&&!previous)throw new Error('Item não encontrado.');
  if(!id&&(!newId||home.purchases.some(p=>p.id===newId)))throw new Error('Identificador repetido.');
  if(previous?.projectId && previous.projectId!==draft.projectId)projectEditable(home,previous.projectId);
  const status=draft.status??(draft.purchased?'comprado':'preciso');
  const purchase:Purchase={
    ...draft,id:id??newId,createdAt:previous?.createdAt??now,
    name:draft.name.trim(),category:draft.category.trim(),
    unit:(draft.unit||'un.').trim(),
    status,purchased:BOUGHT.has(status),
    projectId:draft.projectId||undefined,taskId:draft.projectId?(draft.taskId||undefined):undefined,
  };
  return validateHome({...home,purchases:id
    ?home.purchases.map(p=>p.id===id?purchase:p):[purchase,...home.purchases]});
}
export function changePurchaseStatus(home:HomeData,id:string,status:PurchaseStatus):HomeData {
  const purchase=home.purchases.find(p=>p.id===id);
  if(!purchase)throw new Error('Item não encontrado.');
  if(purchase.projectId)projectEditable(home,purchase.projectId);
  return validateHome({...home,purchases:home.purchases.map(p=>p.id===id
    ?{...p,status,purchased:BOUGHT.has(status)}:p)});
}
export function deletePurchase(home:HomeData,id:string):HomeData {
  const purchase=home.purchases.find(p=>p.id===id);
  if(!purchase)throw new Error('Item não encontrado.');
  if(purchase.projectId)projectEditable(home,purchase.projectId);
  return validateHome({...home,purchases:home.purchases.filter(p=>p.id!==id)});
}
export function addPurchaseQuote(home:HomeData,purchaseId:string,quote:PurchaseQuote):HomeData {
  const purchase=home.purchases.find(p=>p.id===purchaseId);
  if(!purchase)throw new Error('Item não encontrado.');
  if(purchase.projectId)projectEditable(home,purchase.projectId);
  if(!quote.id.trim()||!quote.supplier.trim()||!Number.isSafeInteger(quote.unitPriceCents)
    ||quote.unitPriceCents<0||(!/^https?:\/\//i.test(quote.url)&&quote.url!=='')
    ||!Number.isFinite(Date.parse(quote.createdAt)))throw new Error('Cotação inválida.');
  if((purchase.quotes??[]).some(q=>q.id===quote.id))throw new Error('Cotação duplicada.');
  return validateHome({...home,purchases:home.purchases.map(p=>p.id===purchaseId
    ?{...p,quotes:[...(p.quotes??[]),quote]}:p)});
}
export function removePurchaseQuote(home:HomeData,purchaseId:string,quoteId:string):HomeData {
  const purchase=home.purchases.find(p=>p.id===purchaseId);
  if(!purchase)throw new Error('Item não encontrado.');
  if(purchase.projectId)projectEditable(home,purchase.projectId);
  if(!(purchase.quotes??[]).some(q=>q.id===quoteId))throw new Error('Cotação não encontrada.');
  return validateHome({...home,purchases:home.purchases.map(p=>p.id===purchaseId
    ?{...p,quotes:(p.quotes??[]).filter(q=>q.id!==quoteId)}:p)});
}
export function setServiceCosts(home:HomeData,taskId:string,estimated:number|null,actual:number|null,now:string):HomeData {
  const task=home.workTasks.find(t=>t.id===taskId);
  if(!task)throw new Error('Tarefa não encontrada.');
  projectEditable(home,task.projectId);
  for(const v of [estimated,actual])if(v!==null&&(!Number.isSafeInteger(v)||v<0))throw new Error('Custo inválido.');
  return validateHome({...home,workTasks:home.workTasks.map(t=>t.id===taskId
    ?{...t,estimatedCostCents:estimated,actualCostCents:actual,updatedAt:now,
      history:[...t.history,{id:`cost-${now}-${taskId}`,occurredAt:now,description:'Custos do serviço atualizados'}]}:t)});
}
export function setProjectContingency(home:HomeData,projectId:string,percent:number,now:string):HomeData {
  projectEditable(home,projectId);
  if(!Number.isInteger(percent)||percent<0||percent>50)throw new Error('Reserva entre 0% e 50%.');
  return validateHome({...home,projects:home.projects.map(p=>p.id===projectId?{
    ...p,contingencyPercent:percent,updatedAt:now}:p)});
}
