import { describe, expect, it } from 'vitest';
import { initialHome, validateHome } from '../../data';
import { makeSpaceForRoom } from '../../domain/homeMigration';
import { createProject, deleteProject, newProjectDraft, updateProject } from './projectDomain';
import { blankTask, newProjectTask } from './taskDomain';
import type { HomeData, Purchase, Room } from '../../types';
import {
  addPurchaseQuote, asCents, centsFromText, changePurchaseStatus, currentStatus,
  deletePurchase, projectBudget, removePurchaseQuote, savePurchase,
  setProjectContingency, setServiceCosts,
} from './budgetDomain';

const now='2026-11-16T12:00:00.000Z',later='2026-11-16T13:00:00.000Z';
const room:Room={id:'room',name:'Sala',width:4,length:3,height:2.7,x:0,z:0};
function home():HomeData {
  const root:HomeData={...structuredClone(initialHome),rooms:[room],spaces:[makeSpaceForRoom(room)],
    purchases:[{id:'legacy',name:'Lâmpada',category:'Iluminação',priority:'baixa',
      roomId:'room',quantity:2,unitPrice:35,purchased:false,notes:'',url:'',createdAt:now}]};
  return createProject(validateHome(root),{...newProjectDraft('residence-primary'),
    name:'Renovar sala',spaceIds:['space-room:room'],budgetTargetCents:500000},'projeto',now);
}
const material=(overrides:Partial<Purchase>={})=>({
  name:'Tinta',category:'Pintura',roomId:'room',priority:'media' as const,
  quantity:3,unitPrice:72.5,purchased:false,notes:'',url:'',unit:'L',
  projectId:'projeto',status:'preciso' as const,...overrides,
});

describe('F6.3 — compras e orçamentos',()=>{
  it('vincula um único item à lista global e ao projeto sem duplicação',()=>{
    const before=home();
    const result=savePurchase(before,material(),null,now,'tinta');
    expect(result.purchases).toHaveLength(2);
    expect(result.purchases.find(p=>p.id==='tinta')?.projectId).toBe('projeto');
    expect(projectBudget(result,'projeto').materialsCents).toBe(21750);
    expect(result.purchases.find(p=>p.id==='legacy')?.projectId).toBeUndefined();
    expect(result.rooms).toEqual(before.rooms);
  });
  it('calcula custos em centavos e não confunde previsão com gasto real',()=>{
    const start=savePurchase(home(),material(),null,now,'tinta');
    const purchased=changePurchaseStatus(start,'tinta','comprado');
    expect(projectBudget(purchased,'projeto').registeredCents).toBe(0);
    expect(projectBudget(purchased,'projeto').confirmedItems).toBe(0);
    const known=savePurchase(purchased,{...material({status:'comprado',purchased:true,
      actualUnitPriceCents:6999})},'tinta',later,'ignored');
    expect(projectBudget(known,'projeto').materialsCents).toBe(21750);
    expect(projectBudget(known,'projeto').registeredCents).toBe(20997);
    expect(projectBudget(known,'projeto').confirmedItems).toBe(1);
    expect(currentStatus(known.purchases.find(p=>p.id==='legacy')!)).toBe('preciso');
    expect(asCents(79.9)).toBe(7990);
    expect(centsFromText('123,45')).toBe(12345);
    expect(()=>centsFromText('123,456')).toThrow();
  });
  it('adiciona custo de mão de obra e reserva sem dupla contagem de materiais',()=>{
    const bought=savePurchase(home(),material(),null,now,'tinta');
    const withTask=newProjectTask(bought,{...blankTask('projeto'),title:'Pintura da sala',kind:'servico'},
      'tarefa','evento',now);
    const labor=setServiceCosts(withTask,'tarefa',150000,125000,later);
    const reserved=setProjectContingency(labor,'projeto',10,later);
    const budget=projectBudget(reserved,'projeto');
    expect(budget.materialsCents).toBe(21750);
    expect(budget.servicesCents).toBe(150000);
    expect(budget.baseCents).toBe(171750);
    expect(budget.reserveCents).toBe(17175);
    expect(budget.forecastCents).toBe(188925);
    expect(budget.registeredCents).toBe(125000);
    expect(budget.balanceCents).toBe(311075);
    expect(reserved.workTasks[0].history.at(-1)?.description).toBe('Custos do serviço atualizados');
  });
  it('aceita orçamento de deck sem ambiente, respeitando vínculos de tarefa',()=>{
    let state=createProject(home(),{...newProjectDraft('residence-primary'),name:'Deck novo'},'deck',now);
    state=newProjectTask(state,{...blankTask('deck'),title:'Medir terreno'},'medicao','evento',now);
    const item=material({roomId:'',projectId:'deck',taskId:'medicao'});
    const next=savePurchase(state,item,null,now,'madeira');
    expect(next.purchases.find(p=>p.id==='madeira')?.taskId).toBe('medicao');
    expect(()=>savePurchase(next,material({taskId:'medicao'}),null,now,'invalido')).toThrow();
    expect(()=>savePurchase(next,material({projectId:undefined,taskId:'medicao'}),null,now,'invalido')).toThrow();
  });
  it('não permite excluir projetos com compras ou órfãos em importação',()=>{
    const state=savePurchase(home(),material(),null,now,'tinta');
    expect(()=>deleteProject(state,'projeto')).toThrow('compras');
    expect(()=>validateHome({...state,projects:[]})).toThrow();
    const without=deletePurchase(state,'tinta');
    expect(deleteProject(without,'projeto').projects).toHaveLength(0);
  });
  it('mantém cotações por item, não as confunde com preço estimado',()=>{
    const state=savePurchase(home(),material(),null,now,'tinta');
    const quote={id:'q1',supplier:'Loja A',unitPriceCents:6900,url:'https://example.org/a',createdAt:now};
    const withQuote=addPurchaseQuote(state,'tinta',quote);
    expect(withQuote.purchases.find(p=>p.id==='tinta')?.quotes).toEqual([quote]);
    expect(projectBudget(withQuote,'projeto').materialsCents).toBe(21750);
    expect(()=>addPurchaseQuote(withQuote,'tinta',quote)).toThrow();
    expect(removePurchaseQuote(withQuote,'tinta','q1').purchases.find(p=>p.id==='tinta')?.quotes).toEqual([]);
  });
  it('bloqueia compras de projeto arquivado e permite reabrir',()=>{
    const start=savePurchase(home(),material(),null,now,'tinta');
    const archived=validateHome({...start,projects:start.projects.map(p=>({...p,archivedAt:later}))});
    expect(()=>changePurchaseStatus(archived,'tinta','comprado')).toThrow('Reative');
    expect(()=>deletePurchase(archived,'tinta')).toThrow('Reative');
  });
  it('bloqueia remoção de ambiente vinculado a compra e aceita compra independente legada',()=>{
    const start=savePurchase(home(),material(),null,now,'tinta');
    expect(()=>updateProject(start,'projeto',{...newProjectDraft('residence-primary'),
      name:'Renovar sala',spaceIds:[]},later)).toThrow('compras');
    const legacy:Partial<Purchase>={...start.purchases[0],projectId:undefined,taskId:undefined,
      status:undefined,actualUnitPriceCents:undefined};
    expect(validateHome({...start,purchases:[legacy,...start.purchases.slice(1)]}).purchases).toHaveLength(2);
  });
  it('serializa dados financeiros e mantém backups V2 de versões anteriores',()=>{
    const state=savePurchase(home(),material({actualUnitPriceCents:7299}),null,now,'tinta');
    const next=validateHome(JSON.parse(JSON.stringify(state)));
    expect(next).toEqual(state);
    const old={...next,purchases:next.purchases.map(p=>{const {status:_s,projectId:_p,taskId:_t,unit:_u,
      actualUnitPriceCents:_c,quotes:_q,supplier:_sup,...legacy}=p;void _s;void _p;void _t;void _u;void _c;void _q;void _sup;return legacy;})};
    expect(validateHome(old).purchases).toHaveLength(2);
  });
});
