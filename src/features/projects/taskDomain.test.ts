import { describe, expect, it } from 'vitest';
import { initialHome, validateHome } from '../../data';
import { makeSpaceForRoom } from '../../domain/homeMigration';
import { createProject, deleteProject, newProjectDraft, updateProject } from './projectDomain';
import type { HomeData, ProjectTask, Room } from '../../types';
import {
  blankTask, editProjectTask, newProjectTask, projectTaskProgress, removeProjectTask,
  setProjectTaskStatus, taskChecklistProgress, toggleProjectChecklist,
} from './taskDomain';

const now='2026-11-16T13:00:00.000Z';
const later='2026-11-16T14:00:00.000Z';
const room:Room={id:'sala',name:'Sala',width:4,length:3,height:2.7,x:0,z:0};

function home():HomeData {
  const base=structuredClone(initialHome);
  const withRoom:HomeData={...base,rooms:[room],spaces:[makeSpaceForRoom(room)],
    purchases:[{id:'tinta',name:'Tinta',category:'Pintura',roomId:'sala',priority:'media',
      quantity:2,unitPrice:72,purchased:false,notes:'',url:'',createdAt:now}],
    wallStages:{'sala:norte':{Pintura:'concluido'}},
    logs:[{id:'log',roomId:'sala',direction:'norte',stage:'Pintura',status:'concluido',note:'',createdAt:now}],
  };
  const draft={...newProjectDraft('residence-primary'),name:'Renovar sala',spaceIds:['space-room:sala']};
  return createProject(withRoom,draft,'project-1',now);
}
const checklist=()=>[{id:'check-1',title:'Cobrir os móveis',done:false},{id:'check-2',title:'Aplicar tinta',done:false}];
const first=()=>({...blankTask('project-1'),title:'Pintar sala',kind:'servico' as const,
  spaceId:'space-room:sala',dueDate:'2026-12-10',checklist:checklist()});
function seed():HomeData {return newProjectTask(home(),first(),'task-1','event-1',now)}

describe('F6.2 — tarefas de projetos',()=>{
  it('cadastra serviço com prazo e checklist, preservando compras e obras antigas',()=>{
    const before=home(),after=newProjectTask(before,first(),'task-1','event-1',now);
    expect(after.workTasks).toHaveLength(1);
    expect(after.workTasks[0]).toMatchObject({id:'task-1',projectId:'project-1',kind:'servico',
      title:'Pintar sala',dueDate:'2026-12-10',status:'nao-iniciado',spaceId:'space-room:sala'});
    expect(after.workTasks[0].history).toHaveLength(1);
    expect(after.rooms).toEqual(before.rooms);
    expect(after.purchases).toEqual(before.purchases);
    expect(after.logs).toEqual(before.logs);
    expect(after.wallStages).toEqual(before.wallStages);
    expect(before.workTasks).toEqual([]);
  });
  it('permite tarefa independente de cômodo dentro de projeto, como um deck',()=>{
    const initial=createProject(home(),{...newProjectDraft('residence-primary'),name:'Deck futuro'},'deck',now);
    const result=newProjectTask(initial,{...blankTask('deck'),title:'Planejar fornecedores'},'deck-task','event-d',now);
    expect(result.workTasks.find(t=>t.id==='deck-task')?.spaceId).toBeNull();
  });
  it('edita, marca checklist e registra eventos sem reescrever o histórico',()=>{
    const one=seed();
    const checked=toggleProjectChecklist(one,'task-1','check-1','event-2',later);
    expect(checked.workTasks[0].checklist.map(i=>i.done)).toEqual([true,false]);
    expect(taskChecklistProgress(checked.workTasks[0])).toBe(50);
    expect(checked.workTasks[0].history).toHaveLength(2);
    const changed=editProjectTask(checked,'task-1',{
      ...first(),title:'Pintura completa',checklist:checked.workTasks[0].checklist,
      status:'em-andamento',priority:'alta'},'event-3',later);
    expect(changed.workTasks[0].title).toBe('Pintura completa');
    expect(changed.workTasks[0].history).toHaveLength(3);
    expect(changed.workTasks[0].createdAt).toBe(now);
    const done=setProjectTaskStatus(changed,'task-1','concluido','event-4',later);
    expect(projectTaskProgress(done.workTasks).percent).toBe(100);
    expect(done.projects[0].updatedAt).toBe(later);
  });
  it('não conclui serviço com dependências não concluídas',()=>{
    const one=seed();
    const prep=newProjectTask(one,{...blankTask('project-1'),title:'Preparar parede',dependsOn:['task-1']},'task-2','event-2',now);
    expect(()=>setProjectTaskStatus(prep,'task-2','concluido','event-3',later)).toThrow('dependências');
    const paint=setProjectTaskStatus(prep,'task-1','concluido','event-4',later);
    const complete=setProjectTaskStatus(paint,'task-2','concluido','event-5',later);
    expect(projectTaskProgress(complete.workTasks).done).toBe(2);
    expect(()=>setProjectTaskStatus(complete,'task-1','em-andamento','event-6',later)).toThrow();
  });
  it('rejeita dependências cíclicas e de outro projeto',()=>{
    const one=seed();
    const two=newProjectTask(one,{...blankTask('project-1'),title:'Tarefa dois',dependsOn:['task-1']},'task-2','event-2',later);
    expect(()=>editProjectTask(two,'task-1',{...first(),dependsOn:['task-2']},'event-3',later)).toThrow('ciclos');
    const extra=createProject(two,{...newProjectDraft('residence-primary'),name:'Deck'},'other',later);
    const there=newProjectTask(extra,{...blankTask('other'),title:'Outro projeto'},'task-3','event-4',later);
    expect(()=>editProjectTask(there,'task-3',{...blankTask('other'),title:'Outro projeto',dependsOn:['task-1']},'event-5',later)).toThrow();
  });
  it('protege remoção de serviço referenciado e remoção de projeto com tarefas',()=>{
    const one=seed();
    const two=newProjectTask(one,{...blankTask('project-1'),title:'Instalar luminárias',dependsOn:['task-1']},'task-2','event-2',later);
    expect(()=>removeProjectTask(two,'task-1',later)).toThrow('depende');
    expect(()=>deleteProject(two,'project-1')).toThrow('possui tarefas');
    const after=removeProjectTask(two,'task-2',later);
    expect(removeProjectTask(after,'task-1',later).workTasks).toHaveLength(0);
    expect(deleteProject(removeProjectTask(after,'task-1',later),'project-1').projects).toHaveLength(0);
  });
  it('impede desvincular ambiente com tarefa ativa e permite arquivar sem perder tarefas',()=>{
    const one=seed();
    expect(()=>updateProject(one,'project-1',{...newProjectDraft('residence-primary'),
      name:'Renovar sala',spaceIds:[]},later)).toThrow('tarefa');
    const converted=editProjectTask(one,'task-1',{...first(),spaceId:null},'event-2',later);
    expect(updateProject(converted,'project-1',{...newProjectDraft('residence-primary'),
      name:'Renovar sala',spaceIds:[]},later).projects[0].spaceIds).toEqual([]);
  });
  it('rejeita datas impossíveis, IDs repetidos, checklist duplicado e valores inválidos',()=>{
    const one=seed();
    expect(()=>newProjectTask(one,{...first(),dueDate:'2026-02-30'},'task-2','event-2',later)).toThrow();
    expect(()=>newProjectTask(one,{...first(),title:'a'},'task-2','event-2',later)).toThrow();
    expect(()=>newProjectTask(one,first(),'task-1','event-2',later)).toThrow();
    expect(()=>newProjectTask(one,{...first(),checklist:[checklist()[0],checklist()[0]]},'task-2','event-2',later)).toThrow();
  });
  it('reabre backup V2 sem tarefas, mantendo compatibilidade com documentos F6.1',()=>{
    const before=home();
    const legacy={...before} as Partial<HomeData>;
    delete legacy.workTasks;
    const restored=validateHome(JSON.parse(JSON.stringify(legacy)));
    expect(restored.workTasks).toEqual([]);
    const withTasks=seed();
    expect(validateHome(JSON.parse(JSON.stringify(withTasks)))).toEqual(withTasks);
  });
  it('mantém precisão de progresso para listas vazias e checklists',()=>{
    expect(projectTaskProgress([])).toMatchObject({total:0,done:0,active:0,percent:0});
    expect(taskChecklistProgress({checklist:[]})).toBeNull();
    const one=seed();
    expect(projectTaskProgress(one.workTasks)).toMatchObject({total:1,done:0,active:0,percent:0});
  });
});
