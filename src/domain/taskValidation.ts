import type { HomeData, ProjectTask } from '../types';

const STATUS = new Set(['nao-iniciado','em-andamento','concluido']);
const KINDS = new Set(['tarefa','servico']);
const PRIORITIES = new Set(['urgente','alta','media','baixa']);
const validId = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 160;
const validMoment = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));

export function validLocalDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year,month,day] = date.split('-').map(Number);
  const value=new Date(Date.UTC(year,month-1,day));
  return value.getUTCFullYear()===year && value.getUTCMonth()+1===month && value.getUTCDate()===day;
}

function assertUnique(ids: string[], label: string) {
  if (new Set(ids).size !== ids.length) throw new Error(label + ' contém IDs duplicados.');
}

/** Valida toda a lista, inclusive dependências circulares e referências entre projetos. */
export function validateProjectTasks(home: Pick<HomeData,'projects'|'spaces'|'workTasks'>): void {
  if (!Array.isArray(home.workTasks)) throw new Error('A lista de tarefas é inválida.');
  const tasks=home.workTasks;
  assertUnique(tasks.map(task => task.id), 'A lista de tarefas');
  const byId=new Map(tasks.map(task=>[task.id,task]));
  for (const task of tasks) {
    if (!task || !validId(task.id) || !validId(task.projectId)
      || typeof task.title!=='string' || task.title.trim().length < 2 || task.title.length > 160
      || typeof task.description!=='string' || task.description.length > 4000
      || !KINDS.has(task.kind) || !STATUS.has(task.status) || !PRIORITIES.has(task.priority)
      || (task.phase !== undefined && (typeof task.phase !== 'string' || task.phase.length>80))
      || (task.spaceId!==null && !validId(task.spaceId))
      || (task.dueDate!==null && (typeof task.dueDate!=='string'||!validLocalDate(task.dueDate)))
      || !Array.isArray(task.checklist) || task.checklist.length>100
      || !Array.isArray(task.dependsOn) || task.dependsOn.length>100
      || !Array.isArray(task.history) || task.history.length>1000
      || !validMoment(task.createdAt) || !validMoment(task.updatedAt)
      || (task.estimatedCostCents !== undefined && task.estimatedCostCents !== null
          && (!Number.isSafeInteger(task.estimatedCostCents) || task.estimatedCostCents<0))
      || (task.actualCostCents !== undefined && task.actualCostCents !== null
          && (!Number.isSafeInteger(task.actualCostCents) || task.actualCostCents<0))) {
      throw new Error('Tarefa inválida: confira título, prazo, situação e checklist.');
    }
    const project=home.projects.find(p=>p.id===task.projectId);
    if(!project)throw new Error('Tarefa vinculada a projeto inexistente.');
    if(task.spaceId!==null && (!project.spaceIds.includes(task.spaceId)
      || !home.spaces.some(s=>s.id===task.spaceId && s.residenceId===project.residenceId))) {
      throw new Error('A tarefa possui ambiente fora do projeto.');
    }
    assertUnique(task.checklist.map(item=>item.id),'Checklist');
    for (const item of task.checklist) {
      if(!item || !validId(item.id) || typeof item.title!=='string'
        || !item.title.trim() || item.title.length>180 || typeof item.done!=='boolean') {
        throw new Error('Item de checklist inválido.');
      }
    }
    assertUnique(task.history.map(event=>event.id),'Histórico da tarefa');
    for (const event of task.history) {
      if(!event || !validId(event.id) || !validMoment(event.occurredAt)
        || typeof event.description!=='string' || !event.description.trim() || event.description.length>500) {
        throw new Error('Evento de tarefa inválido.');
      }
    }
    assertUnique(task.dependsOn,'Dependências');
    for (const id of task.dependsOn) {
      const dependency=byId.get(id);
      if(!dependency || dependency.projectId!==task.projectId || id===task.id) {
        throw new Error('Dependência inexistente, entre projetos ou autorreferente.');
      }
      if(task.status==='concluido' && dependency.status!=='concluido') {
        throw new Error('Não é possível concluir uma tarefa antes das dependências.');
      }
    }
  }
  const visited=new Set<string>(), visiting=new Set<string>();
  function walk(task: ProjectTask) {
    if(visiting.has(task.id))throw new Error('Dependências de tarefas não podem formar ciclos.');
    if(visited.has(task.id))return;
    visiting.add(task.id);
    task.dependsOn.forEach(id=>walk(byId.get(id)!));
    visiting.delete(task.id);
    visited.add(task.id);
  }
  tasks.forEach(walk);
}
