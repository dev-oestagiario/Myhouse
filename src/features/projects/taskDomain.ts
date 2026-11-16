import type { HomeData, ProjectTask, ProjectTaskKind, ProjectTaskStatus, Priority } from '../../types';
import { validateHome } from '../../data';

export const TASK_KIND_LABELS: Record<ProjectTaskKind,string> = {
  tarefa: 'Tarefa', servico: 'Serviço',
};
export const TASK_STATUS_LABELS: Record<ProjectTaskStatus,string> = {
  'nao-iniciado': 'Não iniciado', 'em-andamento': 'Em andamento', concluido: 'Concluído',
};
export const TASK_PRIORITY_LABELS: Record<Priority,string> = {
  urgente: 'Urgente', alta: 'Alta', media: 'Média', baixa: 'Baixa',
};
export type TaskDraft = Pick<ProjectTask,
  'projectId'|'spaceId'|'kind'|'title'|'description'|'status'|'priority'|'dueDate'|'checklist'|'dependsOn'>;

export function blankTask(projectId: string): TaskDraft {
  return {
    projectId, spaceId:null,kind:'tarefa',title:'',description:'',
    status:'nao-iniciado',priority:'media',dueDate:null,checklist:[],dependsOn:[],
  };
}

function nowValid(at: string) {
  if (!Number.isFinite(Date.parse(at))) throw new Error('Data da tarefa inválida.');
}
function projectAvailable(home: HomeData, projectId: string) {
  const project = home.projects.find(item=>item.id===projectId);
  if(!project)throw new Error('O projeto desta tarefa não foi encontrado.');
  if(project.archivedAt)throw new Error('Reative o projeto antes de alterar tarefas.');
  return project;
}
function record(task: ProjectTask, id: string, at: string, message: string): ProjectTask {
  return { ...task, updatedAt:at,history:[
    ...task.history,{ id, occurredAt:at, description:message },
  ] };
}
function change(home: HomeData, tasks: ProjectTask[], projectId: string, at: string): HomeData {
  return validateHome({ ...home,workTasks:tasks,
    projects:home.projects.map(p=>p.id===projectId?{...p,updatedAt:at}:p),
  });
}
export function newProjectTask(home: HomeData, draft: TaskDraft, id: string, eventId: string, at: string): HomeData {
  nowValid(at);
  projectAvailable(home,draft.projectId);
  if(!id.trim() || !eventId.trim() || home.workTasks.some(task=>task.id===id))throw new Error('ID da tarefa inválido ou repetido.');
  const task: ProjectTask = {
    ...draft,title:draft.title.trim(),description:draft.description.trim(),
    checklist:draft.checklist.map(item=>({...item,title:item.title.trim()})),
    dependsOn:[...draft.dependsOn], id,createdAt:at,updatedAt:at,
    history:[{id:eventId,occurredAt:at,description:'Tarefa criada'}],
  };
  return change(home,[...home.workTasks,task],task.projectId,at);
}
export function editProjectTask(home:HomeData,id:string,draft:TaskDraft,eventId:string,at:string): HomeData {
  nowValid(at);
  const previous=home.workTasks.find(task=>task.id===id);
  if(!previous)throw new Error('Tarefa não encontrada.');
  projectAvailable(home,previous.projectId);
  if(draft.projectId!==previous.projectId)throw new Error('Mover tarefas entre projetos não é permitido nesta etapa.');
  const next=record({...previous,...draft,title:draft.title.trim(),description:draft.description.trim(),
    checklist:draft.checklist.map(item=>({...item,title:item.title.trim()})),
    dependsOn:[...draft.dependsOn],
  },eventId,at,'Informações atualizadas');
  return change(home,home.workTasks.map(task=>task.id===id?next:task),previous.projectId,at);
}
export function setProjectTaskStatus(home:HomeData,id:string,status:ProjectTaskStatus,eventId:string,at:string):HomeData {
  nowValid(at);
  const previous=home.workTasks.find(task=>task.id===id);
  if(!previous)throw new Error('Tarefa não encontrada.');
  projectAvailable(home,previous.projectId);
  if(previous.status===status)return home;
  const next=record({...previous,status},eventId,at,'Situação: '+TASK_STATUS_LABELS[status]);
  return change(home,home.workTasks.map(task=>task.id===id?next:task),previous.projectId,at);
}
export function toggleProjectChecklist(home:HomeData,taskId:string,checklistId:string,eventId:string,at:string):HomeData {
  nowValid(at);
  const previous=home.workTasks.find(task=>task.id===taskId);
  if(!previous)throw new Error('Tarefa não encontrada.');
  projectAvailable(home,previous.projectId);
  const item=previous.checklist.find(item=>item.id===checklistId);
  if(!item)throw new Error('Item do checklist não encontrado.');
  const checked=!item.done;
  const checklist=previous.checklist.map(row=>row.id===checklistId?{...row,done:checked}:row);
  const next=record({...previous,checklist},eventId,at,(checked?'Concluiu: ':'Reabriu: ')+item.title);
  return change(home,home.workTasks.map(task=>task.id===taskId?next:task),previous.projectId,at);
}
export function removeProjectTask(home:HomeData,id:string,at:string):HomeData {
  nowValid(at);
  const previous=home.workTasks.find(task=>task.id===id);
  if(!previous)throw new Error('Tarefa não encontrada.');
  projectAvailable(home,previous.projectId);
  if(home.workTasks.some(task=>task.dependsOn.includes(id))) {
    throw new Error('Outra tarefa depende desta. Remova o vínculo de dependência antes de excluir.');
  }
  return change(home,home.workTasks.filter(task=>task.id!==id),previous.projectId,at);
}
export function taskChecklistProgress(task:Pick<ProjectTask,'checklist'>):number|null {
  if(!task.checklist.length)return null;
  return Math.round(task.checklist.filter(item=>item.done).length*100/task.checklist.length);
}
export function projectTaskProgress(tasks:ProjectTask[]):{total:number;done:number;active:number;percent:number;overdue:number} {
  const total=tasks.length,done=tasks.filter(task=>task.status==='concluido').length;
  const active=tasks.filter(task=>task.status==='em-andamento').length;
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const overdue=tasks.filter(task=>task.status!=='concluido' && task.dueDate!==null && task.dueDate<today).length;
  return { total,done,active,percent:total?Math.round(done*100/total):0,overdue };
}
