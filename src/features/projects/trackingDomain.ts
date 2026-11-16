import type {HomeData,ProjectTask,Priority,Purchase} from '../../types';
import {currentStatus,projectBudget,purchaseActualCents,purchasePlannedCents} from './budgetDomain';

const PRIORITY:Record<Priority,number>={urgente:0,alta:1,media:2,baixa:3};
export const NO_PHASE='Sem etapa';
export function taskPhase(task:Pick<ProjectTask,'phase'>):string {
  return task.phase?.trim()||NO_PHASE;
}
export function purchasePhase(purchase:Pick<Purchase,'phase'|'taskId'>,tasks:ProjectTask[]):string {
  return purchase.phase?.trim()
    ||tasks.find(task=>task.id===purchase.taskId)?.phase?.trim()||NO_PHASE;
}
/** Total em centavos; separa materiais/serviços e não duplica compras vinculadas a tarefas. */
export function phaseBudget(home:HomeData,projectId:string){
  const {tasks,purchases}=projectBudget(home,projectId);
  const groups=new Map<string,{phase:string;materialsCents:number;servicesCents:number;
    actualCents:number;tasks:number;purchases:number;complete:number}>();
  function group(phase:string){
    if(!groups.has(phase))groups.set(phase,{phase,materialsCents:0,servicesCents:0,actualCents:0,tasks:0,purchases:0,complete:0});
    return groups.get(phase)!;
  }
  for(const task of tasks){
    const row=group(taskPhase(task));
    row.tasks++;row.complete+=Number(task.status==='concluido');
    row.servicesCents+=task.estimatedCostCents??0;
    row.actualCents+=task.actualCostCents??0;
  }
  for(const purchase of purchases){
    const row=group(purchasePhase(purchase,tasks));
    row.purchases++;row.materialsCents+=purchasePlannedCents(purchase);
    if(['comprado','recebido','instalado'].includes(currentStatus(purchase))) {
      row.actualCents+=purchaseActualCents(purchase)??0;
    }
  }
  return [...groups.values()].map(row=>({...row,forecastCents:row.materialsCents+row.servicesCents}))
    .sort((a,b)=>a.phase===NO_PHASE?1:b.phase===NO_PHASE?-1:a.phase.localeCompare(b.phase,'pt-BR'));
}
export type AgendaFilter='todas'|'atrasadas'|'semana'|'mes'|'sem-prazo';
export function localDateToday(now:Date):string {
  return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function agendaTasks(tasks:ProjectTask[],filter:AgendaFilter,today:string):ProjectTask[]{
  const after=(days:number)=>{
    const value=new Date(today+'T12:00:00Z');value.setUTCDate(value.getUTCDate()+days);
    return value.toISOString().slice(0,10);
  };
  return tasks.filter(task=>task.status!=='concluido')
    .filter(task=>{
      if(filter==='sem-prazo')return task.dueDate===null;
      if(filter==='atrasadas')return task.dueDate!==null&&task.dueDate<today;
      if(filter==='semana')return task.dueDate!==null&&task.dueDate>=today&&task.dueDate<=after(7);
      if(filter==='mes')return task.dueDate!==null&&task.dueDate>=today&&task.dueDate<=after(30);
      return true;
    })
    .sort((a,b)=>(a.dueDate??'9999-12-31').localeCompare(b.dueDate??'9999-12-31')
      ||PRIORITY[a.priority]-PRIORITY[b.priority]||a.title.localeCompare(b.title,'pt-BR'));
}
export type Activity={id:string;at:string;title:string;description:string};
export function projectActivities(home:HomeData,projectId:string):Activity[]{
  const project=home.projects.find(x=>x.id===projectId);
  if(!project)return [];
  const tasks=home.workTasks.filter(x=>x.projectId===projectId);
  const scenarios=home.scenarios.filter(s=>s.projectId===projectId);
  const activities:Activity[]=[
    {id:'project-'+project.id,at:project.createdAt,title:'Projeto criado',description:project.name},
    ...tasks.flatMap(task=>task.history.map(event=>({
      id:'task-'+task.id+'-'+event.id,at:event.occurredAt,title:task.title,description:event.description,
    }))),
    ...scenarios.flatMap(s=>s.revisions.map(rev=>({
      id:'scenario-'+s.id+'-'+rev.id,at:rev.savedAt,title:s.name,description:rev.label,
    }))),
    ...(home.projectFiles??[]).filter(f=>f.projectId===projectId).map(f=>({
      id:'file-'+f.id,at:f.uploadedAt,title:'Arquivo anexado',description:f.name,
    })),
    ...home.purchases.filter(p=>p.projectId===projectId).map(p=>({
      id:'purchase-'+p.id,at:p.createdAt,title:'Compra cadastrada',description:p.name,
    })),
  ];
  return activities.sort((a,b)=>b.at.localeCompare(a.at)||a.id.localeCompare(b.id)).slice(0,100);
}
