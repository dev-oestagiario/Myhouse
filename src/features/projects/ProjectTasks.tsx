import FloatingActions from '../../shared/FloatingActions';
import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle, CalendarDays, Check, CheckCheck, ClipboardList, Clock3, Edit3,
  ListChecks, Plus, Trash2,
} from 'lucide-react';
import type { HomeData, Priority, Project, ProjectTask, ProjectTaskChecklistItem, ProjectTaskKind, ProjectTaskStatus } from '../../types';
import { newId, priorityOrder } from '../../data';
import Modal from '../../shared/Modal';
import {
  blankTask, editProjectTask, newProjectTask, projectTaskProgress, removeProjectTask,
  setProjectTaskStatus, taskChecklistProgress, TASK_KIND_LABELS,
  TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, toggleProjectChecklist, type TaskDraft,
} from './taskDomain';
import './tasks.css';

type Props={home: HomeData;project: Project;onChange:(next:HomeData)=>void};
type Filter='todas'|'pendentes'|'concluidas';
const formValue=(task:ProjectTask):TaskDraft=>({
  projectId:task.projectId,spaceId:task.spaceId,kind:task.kind,title:task.title,
  description:task.description,status:task.status,priority:task.priority,
  dueDate:task.dueDate,checklist:task.checklist.map(item=>({...item})),
  dependsOn:[...task.dependsOn],phase:task.phase??'',
});
const formatDate=(date:string)=>date.split('-').reverse().join('/');
const shortTime=(iso:string)=>new Date(iso).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});

export default function ProjectTasks({home,project,onChange}:Props) {
  const tasks=(home.workTasks??[]).filter(task=>task.projectId===project.id);
  const summary=projectTaskProgress(tasks);
  const [editingId,setEditingId]=useState<string|'new'|null>(null);
  const [draft,setDraft]=useState<TaskDraft>(()=>blankTask(project.id));
  const [formError,setFormError]=useState('');
  const [notice,setNotice]=useState('');
  const [filter,setFilter]=useState<Filter>('todas');
  const [view,setView]=useState<'lista'|'quadro'>('lista');
  const [search,setSearch]=useState('');
  const [expandedId,setExpandedId]=useState<string|null>(null);
  const archived=Boolean(project.archivedAt);
  const filtered=useMemo(()=>tasks
    .filter(task=>filter==='todas'||(filter==='concluidas'?task.status==='concluido':task.status!=='concluido'))
    .filter(task=>`${task.title} ${task.description}`.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')))
    .sort((a,b)=>Number(a.status==='concluido')-Number(b.status==='concluido')
      || priorityOrder[a.priority]-priorityOrder[b.priority]
      || (a.dueDate??'9999-12-31').localeCompare(b.dueDate??'9999-12-31')
      || b.updatedAt.localeCompare(a.updatedAt)),[tasks,filter,search]);

  function openEditor(task?:ProjectTask){
    if(archived){setNotice('Reative o projeto para alterar tarefas.');return;}
    setEditingId(task?.id??'new');
    setDraft(task?formValue(task):blankTask(project.id));
    setFormError('');
    setNotice('');
  }
  function commit(e:FormEvent){
    e.preventDefault();
    try {
      const at=new Date().toISOString();
      const updated=editingId==='new'
        ?newProjectTask(home,draft,newId(),newId(),at)
        :editProjectTask(home,editingId!,draft,newId(),at);
      onChange(updated);setEditingId(null);
      setNotice(editingId==='new'?'Tarefa criada. Aguarde a sincronização.':'Tarefa atualizada. Aguarde a sincronização.');
    }catch(error){setFormError(error instanceof Error?error.message:'Não foi possível salvar a tarefa.');}
  }
  function run(op:()=>HomeData,message:string){
    try{onChange(op());setNotice(message);}
    catch(error){setNotice(error instanceof Error?error.message:'Não foi possível alterar a tarefa.');}
  }
  function remove(task:ProjectTask){
    if(!window.confirm(`Excluir a tarefa "${task.title}" e seu checklist? Essa ação não poderá ser desfeita. Os registros legados de obras serão preservados.`))return;
    run(()=>removeProjectTask(home,task.id,new Date().toISOString()),'Tarefa excluída.');
  }
  const addChecklist=()=>setDraft(prev=>({...prev,checklist:[...prev.checklist,{id:newId(),title:'',done:false}]}));
  const changeChecklist=(id:string,patch:Partial<ProjectTaskChecklistItem>)=>setDraft(prev=>({...prev,
    checklist:prev.checklist.map(item=>item.id===id?{...item,...patch}:item)}));
  const removeChecklist=(id:string)=>setDraft(prev=>({...prev,checklist:prev.checklist.filter(item=>item.id!==id)}));
  const projectSpaces=project.spaceIds.map(id=>home.spaces.find(space=>space.id===id)).filter((item):item is NonNullable<typeof item>=>Boolean(item));
  const selectableDeps=tasks.filter(task=>task.id!==editingId);
  const renderTask=(task:ProjectTask)=>{
      const checked=task.checklist.filter(item=>item.done).length;
      const fraction=taskChecklistProgress(task);
      const deps=task.dependsOn.map(id=>tasks.find(item=>item.id===id)).filter((item):item is ProjectTask=>Boolean(item));
      const blocked=deps.some(item=>item.status!=='concluido');
      return <article className="task-card" key={task.id}>
        <div className="task-card-top">
          <div className="task-card-main">
            <span className="task-kind">{TASK_KIND_LABELS[task.kind]}</span>
            <h4>{task.title}</h4>
            {task.description&&<p>{task.description}</p>}
          </div>
          <div className="task-card-actions">
            <button type="button" className="icon-button" disabled={archived} title="Editar tarefa" aria-label={`Editar tarefa ${task.title}`} onClick={()=>openEditor(task)}><Edit3 size={17}/></button>
            <button type="button" className="icon-button danger-hover" disabled={archived} title="Excluir tarefa" aria-label={`Excluir tarefa ${task.title}`} onClick={()=>remove(task)}><Trash2 size={17}/></button>
          </div>
        </div>
        <div className="task-meta">
          <span className={`task-priority ${task.priority}`}>{TASK_PRIORITY_LABELS[task.priority]}</span>
          {task.phase?.trim()&&<span>Etapa: {task.phase}</span>}
          <span>{task.spaceId ? home.spaces.find(space=>space.id===task.spaceId)?.name??'Ambiente indisponível' : 'Sem ambiente'}</span>
          {task.dueDate&&<span className="task-due"><CalendarDays size={14}/>Até {formatDate(task.dueDate)}</span>}
        </div>
        <div className="task-status-row">
          <label>Situação<select aria-label={`Situação de ${task.title}`} value={task.status}
            disabled={archived} onChange={e=>run(()=>setProjectTaskStatus(home,task.id,e.target.value as ProjectTaskStatus,newId(),new Date().toISOString()),'Situação atualizada.')}>
            {Object.entries(TASK_STATUS_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </select></label>
          {blocked&&<span className="task-blocked"><AlertTriangle size={15}/>Depende da conclusão de outra tarefa</span>}
        </div>
        {!!task.checklist.length&&<div className="task-checklist">
          <div className="task-checklist-heading"><strong>Checklist</strong><span>{checked}/{task.checklist.length}{fraction!==null?` · ${fraction}%`:''}</span></div>
          {task.checklist.map(item=><label key={item.id}><input type="checkbox" checked={item.done} disabled={archived}
            onChange={()=>run(()=>toggleProjectChecklist(home,task.id,item.id,newId(),new Date().toISOString()),'Checklist atualizado.')}/><span>{item.title}</span></label>)}
        </div>}
        {!!deps.length&&<div className="task-dependencies"><strong>Depende de:</strong> {deps.map(item=>`${item.title} (${TASK_STATUS_LABELS[item.status]})`).join('; ')}</div>}
        <button type="button" className="task-history-toggle" aria-expanded={expandedId===task.id}
          onClick={()=>setExpandedId(current=>current===task.id?null:task.id)}>
          {expandedId===task.id?'Ocultar histórico':'Ver histórico'} ({task.history.length})
        </button>
        {expandedId===task.id&&<ol className="task-history">{[...task.history].reverse().map(event=><li key={event.id}><time dateTime={event.occurredAt}>{shortTime(event.occurredAt)}</time><span>{event.description}</span></li>)}</ol>}
      </article>;
      };


  return <section className="task-workspace panel" aria-label="Tarefas do projeto">
    <div className="task-workspace-head">
      <div><span className="eyebrow dark-eyebrow">PLANEJAMENTO E EXECUÇÃO</span><h3>Tarefas e serviços</h3>
        <p>Organize trabalhos de qualquer tipo, como pintar, instalar móveis, contratar serviços ou montar um deck.</p></div>
      <FloatingActions actions={[{label:'Nova tarefa',disabled:archived,onClick:()=>openEditor()}]}/>
    </div>
    {notice&&<div className="task-notice" role="status">{notice}<button type="button" aria-label="Dispensar aviso" onClick={()=>setNotice('')}>×</button></div>}
    {archived&&<p className="task-archived-notice" role="status">Este projeto está arquivado. Reative-o para criar ou atualizar tarefas.</p>}
    <div className="task-stats">
      <div><ClipboardList size={18}/><span>Total</span><strong>{summary.total}</strong></div>
      <div><Clock3 size={18}/><span>Em andamento</span><strong>{summary.active}</strong></div>
      <div><CheckCheck size={18}/><span>Concluídas</span><strong>{summary.done}</strong></div>
      <div><AlertTriangle size={18}/><span>Atrasadas</span><strong>{summary.overdue}</strong></div>
    </div>
    <div className="task-progress" role="group" aria-label="Progresso das tarefas">
      <div><strong>{summary.percent}% concluído</strong><span>{summary.done} de {summary.total} tarefas</span></div>
      <div className="task-progress-track" role="progressbar" aria-label="Tarefas concluídas" aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.percent}><span style={{width:`${summary.percent}%`}}/></div>
    </div>
    <div className="task-filters" role="group" aria-label="Filtrar tarefas">
      <label>Pesquisar tarefas<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nome ou descrição"/></label>
      <label>Exibição<select value={filter} onChange={e=>setFilter(e.target.value as Filter)}><option value="todas">Todas</option><option value="pendentes">Pendentes</option><option value="concluidas">Concluídas</option></select></label>
    </div>
    {!filtered.length ? <div className="task-empty"><ListChecks size={29}/><strong>{tasks.length?'Nenhuma tarefa encontrada':'Nenhuma tarefa cadastrada'}</strong>
        <p>{tasks.length?'Altere os filtros para encontrar os serviços deste projeto.':'Cadastre os trabalhos necessários para realizar este projeto. Não é preciso ter uma planta 3D.'}</p>
      </div> : <>
      <div className="task-view-switch" role="group" aria-label="Visualização das tarefas">
        <button type="button" aria-pressed={view==='lista'} className={view==='lista'?'active':''} onClick={()=>setView('lista')}>Lista</button>
        <button type="button" aria-pressed={view==='quadro'} className={view==='quadro'?'active':''} onClick={()=>setView('quadro')}>Quadro</button>
      </div>
      {view==='lista'
        ? <div className="task-list">{filtered.map(renderTask)}</div>
        : <div className="task-board" aria-label="Quadro de tarefas por situação">
            {(['nao-iniciado','em-andamento','concluido'] as ProjectTaskStatus[]).map(status=>
              <section key={status} className="task-board-column">
                <h4>{TASK_STATUS_LABELS[status]} <span>({filtered.filter(item=>item.status===status).length})</span></h4>
                <div className="task-board-items">{filtered.filter(item=>item.status===status).map(renderTask)}</div>
              </section>)}
          </div>}
    </>}
    {editingId!==null&&<Modal title={editingId==='new'?'Nova tarefa':'Editar tarefa'} onClose={()=>setEditingId(null)}>
      <form className="modal-form task-editor" onSubmit={commit}>
        <div className="field"><label htmlFor="task-name">Nome da tarefa *</label><input id="task-name" required minLength={2} maxLength={160}
          placeholder="Ex.: Pintar parede, instalar iluminação" value={draft.title}
          onChange={e=>setDraft(p=>({...p,title:e.target.value}))}/></div>
        <div className="field"><label htmlFor="task-description">Descrição</label><textarea id="task-description" maxLength={4000} rows={3}
          placeholder="Descreva o que será feito e detalhes importantes." value={draft.description}
          onChange={e=>setDraft(p=>({...p,description:e.target.value}))}/></div>
        <div className="form-row">
          <div className="field"><label htmlFor="task-kind">Tipo</label><select id="task-kind" value={draft.kind} onChange={e=>setDraft(p=>({...p,kind:e.target.value as ProjectTaskKind}))}>
            {Object.entries(TASK_KIND_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
          <div className="field"><label htmlFor="task-state">Situação</label><select id="task-state" value={draft.status} onChange={e=>setDraft(p=>({...p,status:e.target.value as ProjectTaskStatus}))}>
            {Object.entries(TASK_STATUS_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
        </div>
        <div className="form-row">
          <div className="field"><label htmlFor="task-priority">Prioridade</label><select id="task-priority" value={draft.priority} onChange={e=>setDraft(p=>({...p,priority:e.target.value as Priority}))}>
            {Object.entries(TASK_PRIORITY_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
          <div className="field"><label htmlFor="task-date">Prazo previsto (opcional)</label><input id="task-date" type="date" value={draft.dueDate??''}
            onChange={e=>setDraft(p=>({...p,dueDate:e.target.value||null}))}/></div>
        </div>
        <div className="field"><label htmlFor="task-phase">Etapa do projeto (opcional)</label><input id="task-phase" maxLength={80} list="task-phases" placeholder="Ex.: Preparação, acabamento" value={draft.phase??''} onChange={e=>setDraft(p=>({...p,phase:e.target.value}))}/>
          <datalist id="task-phases">{Array.from(new Set(tasks.map(t=>t.phase).filter(Boolean))).map(phase=><option key={phase} value={phase}/>)}</datalist></div>
        {!!projectSpaces.length&&<div className="field"><label htmlFor="task-space">Ambiente (opcional)</label><select id="task-space" value={draft.spaceId??''}
          onChange={e=>setDraft(p=>({...p,spaceId:e.target.value||null}))}>
          <option value="">Sem ambiente definido</option>{projectSpaces.map(space=><option value={space.id} key={space.id}>{space.name}</option>)}</select></div>}
        <fieldset className="task-editor-checklist"><legend>Checklist de execução</legend>
          <div className="task-editor-checkitems">{draft.checklist.map((item,index)=><div key={item.id} className="task-editor-checkitem">
            <label className="visually-hidden" htmlFor={`item-${item.id}`}>Etapa {index+1}</label>
            <input id={`item-${item.id}`} value={item.title} maxLength={180} placeholder={`Etapa ${index+1}`} required
              onChange={e=>changeChecklist(item.id,{title:e.target.value})}/>
            <button type="button" className="icon-button danger-hover" aria-label={`Excluir etapa ${index+1}`} onClick={()=>removeChecklist(item.id)}><Trash2 size={15}/></button>
          </div>)}</div>
          <button type="button" className="btn btn-outline" onClick={addChecklist} disabled={draft.checklist.length>=100}><Plus size={15}/>Adicionar etapa</button>
        </fieldset>
        {!!selectableDeps.length&&<fieldset className="task-editor-deps"><legend>Depende de outras tarefas (opcional)</legend>
          <div>{selectableDeps.map(task=><label key={task.id}><input type="checkbox"
            checked={draft.dependsOn.includes(task.id)} onChange={e=>setDraft(prev=>({
              ...prev,dependsOn:e.target.checked?[...prev.dependsOn,task.id]:prev.dependsOn.filter(id=>id!==task.id),
            }))}/><span>{task.title}</span></label>)}</div>
          <small>Uma tarefa com dependências pendentes não poderá ser marcada como concluída.</small>
        </fieldset>}
        {formError&&<p className="task-form-error" role="alert">{formError}</p>}
        <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={()=>setEditingId(null)}>Cancelar</button>
          <button type="submit" className="btn btn-primary"><Check size={16}/>Salvar tarefa</button></div>
      </form>
    </Modal>}
  </section>;
}
