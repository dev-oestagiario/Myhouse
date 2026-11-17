import FloatingActions from '../../shared/FloatingActions';
import type { ProjectSection } from '../../navigation';
import './projects.css';
import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Archive, ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, ClipboardList, Edit3,
  FolderKanban, Home, Layers3, RotateCcw, Search, Trash2, Wallet,
} from 'lucide-react';
import type { HomeData, Priority, Project, ProjectStatus, ProjectType, Space } from '../../types';
import { money, newId, priorityOrder } from '../../data';
import Modal from '../../shared/Modal';
import ProjectTasks from './ProjectTasks';
import ProjectBudget from './ProjectBudget';
const ScenarioWorkspace = lazy(() => import('./ScenarioWorkspace'));
import ProjectTracking from './ProjectTracking';
import ProjectFiles from './ProjectFiles';
import { projectBudget } from './budgetDomain';
import { projectTaskProgress } from './taskDomain';
import {
  createProject, deleteProject, formatBudgetInput, newProjectDraft, parseBudgetCents,
  PROJECT_PRIORITY_LABELS, PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS,
  setProjectArchived, updateProject, type ProjectDraft,
} from './projectDomain';

type Props = {
  home: HomeData;
  userId:string;
  selectedId:string|null;
  projectTab:ProjectSection;
  detailId:string|null;
  createRequested:boolean;
  onSelectProject:(id:string|null,section?:ProjectSection,detailId?:string)=>void;
  onCloseCreate:()=>void;
  onChange: (next: HomeData) => void;
  onOpenRoom: (roomId: string) => void;
};

type EditorDraft = Omit<ProjectDraft, 'budgetTargetCents'> & { budgetText: string };

const getEditorDraft = (project: Project | null, residenceId: string): EditorDraft => {
  const initial = project ?? newProjectDraft(residenceId);
  return {
    name: initial.name, description: initial.description, residenceId: initial.residenceId,
    type: initial.type, status: initial.status, priority: initial.priority,
    spaceIds: [...initial.spaceIds], budgetText: formatBudgetInput(initial.budgetTargetCents),
  };
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pt-BR', {day:'2-digit', month:'short',year:'numeric'});
}

const projectMoney = (cents: number | null) => cents === null ? 'Não informado' : money(cents / 100);

export default function ProjectWorkspace({ home, userId, selectedId, projectTab, detailId, createRequested, onSelectProject, onCloseCreate, onChange, onOpenRoom }: Props) {
  const residence = home.residences.find(item => item.type === 'atual') ?? home.residences[0];
  const spaces = home.spaces.filter(item => item.residenceId === residence.id);
  const setSelectedId=(id:string|null)=>onSelectProject(id);
  const setProjectTab=(section:ProjectSection)=>onSelectProject(selectedId,section);
  const openChild=(id:string|null)=>onSelectProject(selectedId,projectTab,id??undefined);
  const [editId, setEditId] = useState<string | 'new' | null>(null);
  const [editor, setEditor] = useState<EditorDraft>(() => getEditorDraft(null, residence.id));
  const [editorError, setEditorError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'todos'>('todos');
  const [typeFilter, setTypeFilter] = useState<ProjectType | 'todos'>('todos');
  const [archiveFilter, setArchiveFilter] = useState<'ativos' | 'arquivados' | 'todos'>('ativos');

  const projects = useMemo(() => home.projects
    .filter(item => item.residenceId === residence.id)
    .filter(item => archiveFilter === 'todos' || (archiveFilter === 'arquivados' ? Boolean(item.archivedAt) : !item.archivedAt))
    .filter(item => statusFilter === 'todos' || item.status === statusFilter)
    .filter(item => typeFilter === 'todos' || item.type === typeFilter)
    .filter(item => `${item.name} ${item.description} ${PROJECT_TYPE_LABELS[item.type]}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR').trim()))
    .sort((a,b) => Number(Boolean(a.archivedAt)) - Number(Boolean(b.archivedAt))
      || priorityOrder[a.priority] - priorityOrder[b.priority]
      || b.updatedAt.localeCompare(a.updatedAt)),
    [home.projects,residence.id,archiveFilter,statusFilter,typeFilter,search]);
  const selectedProject = home.projects.find(item => item.id === selectedId && item.residenceId === residence.id) ?? null;
  const activeCount = home.projects.filter(item=>item.residenceId===residence.id && !item.archivedAt).length;
  const plannedCount = home.projects.filter(item=>item.residenceId===residence.id && !item.archivedAt && item.status==='planejando').length;
  const executingCount = home.projects.filter(item=>item.residenceId===residence.id && !item.archivedAt && item.status==='em-execucao').length;

  useEffect(()=>{setEditId(null);},[selectedId]);
  useEffect(()=>{
    if(createRequested){openEditor();}else if(editId==='new')setEditId(null);
  },[createRequested]);
  function closeEditor(){
    setEditId(null);
    if(createRequested)onCloseCreate();
  }

  function openEditor(project?: Project) {
    if(project?.archivedAt) { setFeedback('Reative o projeto para editar suas informações.'); return; }
    setEditId(project?.id ?? 'new');
    setEditor(getEditorDraft(project ?? null,residence.id));
    setEditorError('');
    setFeedback('');
  }

  function commit(event: FormEvent) {
    event.preventDefault();
    try {
      const draft: ProjectDraft = {
        name: editor.name,description: editor.description,residenceId: editor.residenceId,
        type: editor.type,status: editor.status,priority:editor.priority,
        spaceIds: editor.spaceIds,budgetTargetCents:parseBudgetCents(editor.budgetText),
      };
      const timestamp = new Date().toISOString();
      const projectId = editId === 'new' ? newId() : editId;
      if (!projectId) throw new Error('Selecione um projeto válido.');
      const updated = editId === 'new'
        ? createProject(home,draft,projectId,timestamp)
        : updateProject(home,projectId,draft,timestamp);
      onChange(updated);
      onSelectProject(projectId,editId==='new'?'tarefas':projectTab);
      setEditId(null);
      setFeedback(editId === 'new' ? 'Projeto cadastrado. Aguarde a sincronização na nuvem.' : 'Projeto atualizado. Aguarde a sincronização na nuvem.');
    } catch(problem) {
      setEditorError(problem instanceof Error ? problem.message : 'Não foi possível salvar o projeto.');
    }
  }

  function toggleArchive(project: Project) {
    try {
      const updated=setProjectArchived(home,project.id,!Boolean(project.archivedAt),new Date().toISOString());
      onChange(updated);
      setFeedback(project.archivedAt ? 'Projeto reativado. Aguarde a sincronização.' : 'Projeto arquivado. Você pode reativá-lo quando quiser.');
    } catch(problem) {
      setFeedback(problem instanceof Error ? problem.message : 'Não foi possível alterar o projeto.');
    }
  }

  function removeProject(project: Project) {
    if (!window.confirm(`Excluir permanentemente o projeto "${project.name}"? O projeto não poderá ser restaurado, mas os cômodos e as compras atuais serão preservados. Você pode arquivá-lo em vez de excluir.`)) return;
    try {
      onChange(deleteProject(home,project.id));
      if (selectedId===project.id) setSelectedId(null);
      setFeedback('Projeto excluído. As informações da residência permanecem intactas.');
    } catch(problem) {
      setFeedback(problem instanceof Error ? problem.message : 'Não foi possível excluir o projeto.');
    }
  }

  const areaNames=(item:Project)=>item.spaceIds.map(id=>home.spaces.find(space=>space.id===id)?.name).filter(Boolean).join(', ') || 'Sem ambiente vinculado';
  const selectedTaskProgress=projectTaskProgress((home.workTasks??[]).filter(task=>task.projectId===selectedProject?.id));
  const selectedBudget=selectedProject?projectBudget(home,selectedProject.id):null;

  return <section className="projects-workspace" aria-label="Gerenciamento de projetos">
    {!selectedProject&&<div className="page-title-row projects-title">
      <div><span className="eyebrow dark-eyebrow">MUDANÇAS E REFORMAS</span><h1>Projetos da casa</h1><p>Organize suas ideias, reformas e espaços futuros em um só lugar, sem alterar a planta atual.</p></div>
    </div>}
    {feedback && <div className="projects-feedback" role="status">{feedback}<button type="button" aria-label="Dispensar mensagem" onClick={()=>setFeedback('')}>×</button></div>}
    {selectedProject ? <div className="projects-detail">
      <button type="button" className="projects-return" onClick={()=>{setSelectedId(null);setFeedback('');}}><ArrowLeft size={16}/>Todos os projetos</button>
      <div className="projects-detail-head">
        <div><span className="projects-kicker">{PROJECT_TYPE_LABELS[selectedProject.type]}</span><h1>{selectedProject.name}</h1><p>{selectedProject.archivedAt?'Arquivado':PROJECT_STATUS_LABELS[selectedProject.status]} · {projectMoney(selectedProject.budgetTargetCents)}</p></div>
        <div className="projects-detail-actions">
          {selectedProject.archivedAt
            ? <button type="button" className="btn btn-outline" onClick={()=>toggleArchive(selectedProject)}><RotateCcw size={16}/>Reativar projeto</button>
            : <>
              <button type="button" className="btn btn-outline" onClick={()=>openEditor(selectedProject)}><Edit3 size={16}/>Editar projeto</button>
              <button type="button" className="btn btn-outline" onClick={()=>toggleArchive(selectedProject)}><Archive size={16}/>Arquivar projeto</button>
            </>}
          <button type="button" className="btn btn-outline projects-danger" onClick={()=>removeProject(selectedProject)}><Trash2 size={16}/>Excluir projeto</button>
        </div>
      </div>
      <details className="project-overview-disclosure">
      <summary>Resumo e ambientes <ChevronRight size={17}/></summary>
      {selectedProject.description&&<p className="project-description">{selectedProject.description}</p>}
      <div className="projects-summary">
        <div><span>Situação</span><strong>{selectedProject.archivedAt ? 'Arquivado' : PROJECT_STATUS_LABELS[selectedProject.status]}</strong></div>
        <div><span>Prioridade</span><strong>{PROJECT_PRIORITY_LABELS[selectedProject.priority]}</strong></div>
        <div><span>Orçamento previsto</span><strong>{projectMoney(selectedProject.budgetTargetCents)}</strong><small>Projeção atual: {money((selectedBudget?.forecastCents??0)/100)}</small></div>
        <div><span>Tarefas concluídas</span><strong>{selectedTaskProgress.done} / {selectedTaskProgress.total}</strong></div>
      </div>
      <div className="projects-detail-grid">
        <section className="panel projects-detail-panel">
          <div className="projects-panel-heading"><Layers3 size={20}/><h3>Ambientes envolvidos</h3></div>
          {selectedProject.spaceIds.length ? <div className="projects-associated-spaces">{selectedProject.spaceIds.map(id=>{
            const space=home.spaces.find(s=>s.id===id);
            if(!space)return null;
            return <div className="projects-associated-space" key={id}>
              <div><Home size={17}/><span>{space.name}</span></div>
              {space.roomId&&<button type="button" className="link-button" onClick={()=>onOpenRoom(space.roomId!)}>Abrir cômodo<ArrowRight size={14}/></button>}
            </div>;
          })}</div> : <div className="projects-panel-empty">Ainda não há ambientes vinculados. Isso é normal para ideias como construir um deck ou planejar uma mudança.</div>}
        </section>
        <section className="panel projects-detail-panel">
          <div className="projects-panel-heading"><ClipboardList size={20}/><h3>Planejamento da execução</h3></div>
          <p><strong>{selectedTaskProgress.percent}% das tarefas concluídas.</strong> Registre serviços, checklists, prioridades, prazos e dependências na seção abaixo.</p>
          <p>Compras, materiais, fornecedores e orçamento já podem ser associados a este projeto. Crie versões futuras da planta na aba Cenários 2D/3D, sem modificar os cômodos da casa atual.</p>
        </section>
      </div>
      </details>
      <div className="projects-section-tabs" role="tablist" aria-label="Planejamento do projeto">
        <button type="button" role="tab" aria-selected={projectTab==='tarefas'} onClick={()=>setProjectTab('tarefas')}>Tarefas e serviços</button>
        <button type="button" role="tab" aria-selected={projectTab==='orcamento'} onClick={()=>setProjectTab('orcamento')}>Compras e orçamento</button>
        <button type="button" role="tab" aria-selected={projectTab==='cenarios'} onClick={()=>setProjectTab('cenarios')}>Cenários 2D/3D</button>
        <button type="button" role="tab" aria-selected={projectTab==='acompanhamento'} onClick={()=>setProjectTab('acompanhamento')}>Acompanhamento</button>
        <button type="button" role="tab" aria-selected={projectTab==='arquivos'} onClick={()=>setProjectTab('arquivos')}>Arquivos</button>
      </div>
      <div role="tabpanel" aria-label={projectTab==='tarefas'?'Tarefas e serviços':projectTab==='orcamento'?'Compras e orçamento':projectTab==='cenarios'?'Cenários 2D/3D':projectTab==='acompanhamento'?'Acompanhamento':'Arquivos'}>
        {projectTab==='tarefas'
          ?<ProjectTasks key={selectedProject.id} home={home} project={selectedProject} detailId={detailId} onOpenDetail={openChild} onChange={onChange}/>
          :projectTab==='orcamento'
            ?<ProjectBudget key={selectedProject.id} home={home} project={selectedProject} onChange={onChange}/>
            :projectTab==='cenarios'
              ?<Suspense fallback={<p role="status" className="projects-panel-empty">Carregando o editor espacial… Tarefas e orçamento continuam disponíveis.</p>}><ScenarioWorkspace key={selectedProject.id} home={home} project={selectedProject} selectedId={detailId} onSelectScenario={openChild} onChange={onChange} onOpenTasks={()=>setProjectTab('tarefas')} onOpenBudget={()=>setProjectTab('orcamento')}/></Suspense>
              :projectTab==='acompanhamento'
                ?<ProjectTracking key={selectedProject.id} home={home} project={selectedProject} onChange={onChange} onOpenTasks={()=>setProjectTab('tarefas')} onOpenBudget={()=>setProjectTab('orcamento')} onOpenFiles={()=>setProjectTab('arquivos')}/>
                :<ProjectFiles key={selectedProject.id} home={home} project={selectedProject} userId={userId} onChange={onChange}/>}
      </div>
    </div> : <>
      <FloatingActions actions={[{label:'Novo projeto',onClick:()=>openEditor()}]}/>
      <div className="projects-overview-stats" aria-label="Resumo dos projetos">
        <div><FolderKanban size={20}/><span>Projetos ativos</span><strong>{activeCount}</strong></div>
        <div><CalendarDays size={20}/><span>Em planejamento</span><strong>{plannedCount}</strong></div>
        <div><Check size={20}/><span>Em execução</span><strong>{executingCount}</strong></div>
      </div>
      <div className="projects-filters" role="group" aria-label="Filtrar projetos">
        <label className="projects-search"><Search size={17}/><span className="visually-hidden">Pesquisar projetos</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar projetos" aria-label="Pesquisar projetos"/></label>
        <label><span>Exibição</span><select value={archiveFilter} onChange={e=>setArchiveFilter(e.target.value as typeof archiveFilter)}><option value="ativos">Ativos</option><option value="arquivados">Arquivados</option><option value="todos">Todos</option></select></label>
        <label><span>Situação</span><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as typeof statusFilter)}><option value="todos">Todas</option>{Object.entries(PROJECT_STATUS_LABELS).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
        <label><span>Tipo</span><select value={typeFilter} onChange={e=>setTypeFilter(e.target.value as typeof typeFilter)}><option value="todos">Todos</option>{Object.entries(PROJECT_TYPE_LABELS).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
      </div>
      {projects.length ? <div className="projects-grid">{projects.map(project=><article key={project.id} className="projects-card">
        <div className="projects-card-head"><span className="projects-kind">{PROJECT_TYPE_LABELS[project.type]}</span><span className={'projects-status '+(project.archivedAt?'archived':project.status)}>{project.archivedAt?'Arquivado':PROJECT_STATUS_LABELS[project.status]}</span></div>
        <h2>{project.name}</h2>
        <p>{project.description || 'Projeto sem descrição. Abra para planejar os próximos passos.'}</p>
        <div className="projects-card-meta"><span><Layers3 size={15}/>{areaNames(project)}</span><span><Wallet size={15}/>{projectMoney(project.budgetTargetCents)}</span><span><ClipboardList size={15}/>{projectTaskProgress((home.workTasks??[]).filter(task=>task.projectId===project.id)).percent}% das tarefas</span></div>
        <div className="projects-card-foot"><span>{PROJECT_PRIORITY_LABELS[project.priority]} · {formatDate(project.updatedAt)}</span><button type="button" className="btn btn-outline projects-open" onClick={()=>{setSelectedId(project.id);setFeedback('');}}>Ver projeto<ArrowRight size={15}/></button></div>
      </article>)}</div> : <div className="projects-empty panel"><FolderKanban size={35}/><h2>{home.projects.some(p=>p.residenceId===residence.id) ? 'Nenhum projeto encontrado' : 'Comece com uma ideia para sua casa'}</h2><p>{home.projects.some(p=>p.residenceId===residence.id) ? 'Experimente alterar os filtros ou procurar nos projetos arquivados.' : 'Planeje uma reforma, uma mudança ou um espaço novo, como um deck. Não é necessário ter a planta 3D pronta.'}</p></div>}
    </>}
    {editId!==null&&<Modal title={editId==='new'?'Novo projeto':'Editar projeto'} onClose={closeEditor}>
      <form className="modal-form projects-form" onSubmit={commit}>
        <p className="form-hint">Cadastre sua ideia e organize tarefas, compras, serviços e orçamento no projeto. Na aba Cenários 2D/3D, você poderá visualizar alternativas para a planta.</p>
        <div className="field"><label htmlFor="project-name">Nome do projeto *</label><input id="project-name" required minLength={2} maxLength={120} value={editor.name} onChange={e=>setEditor(p=>({...p,name:e.target.value}))} placeholder="Ex.: Reformar a sala, Deck no quintal"/></div>
        <div className="field"><label htmlFor="project-description">O que pretende mudar?</label><textarea id="project-description" rows={3} maxLength={4000} value={editor.description} onChange={e=>setEditor(p=>({...p,description:e.target.value}))} placeholder="Descreva o resultado que deseja alcançar."/></div>
        <div className="form-row">
          <div className="field"><label htmlFor="project-type">Tipo de projeto</label><select id="project-type" value={editor.type} onChange={e=>setEditor(p=>({...p,type:e.target.value as ProjectType}))}>{Object.entries(PROJECT_TYPE_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
          <div className="field"><label htmlFor="project-status">Situação</label><select id="project-status" value={editor.status} onChange={e=>setEditor(p=>({...p,status:e.target.value as ProjectStatus}))}>{Object.entries(PROJECT_STATUS_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
        </div>
        <div className="form-row">
          <div className="field"><label htmlFor="project-priority">Prioridade</label><select id="project-priority" value={editor.priority} onChange={e=>setEditor(p=>({...p,priority:e.target.value as Priority}))}>{Object.entries(PROJECT_PRIORITY_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
          <div className="field"><label htmlFor="project-budget">Orçamento previsto (R$)</label><input id="project-budget" inputMode="decimal" value={editor.budgetText} onChange={e=>setEditor(p=>({...p,budgetText:e.target.value}))} placeholder="Ex.: 2500,00"/><small>Opcional, apenas uma meta inicial. Adicione materiais e serviços em Compras e orçamento.</small></div>
        </div>
        <fieldset className="projects-space-picker"><legend>Ambientes envolvidos (opcional)</legend>
          {spaces.length ? <div className="projects-space-options">{spaces.map((space:Space)=><label key={space.id}><input type="checkbox" checked={editor.spaceIds.includes(space.id)} onChange={e=>setEditor(p=>({
            ...p, spaceIds:e.target.checked?[...p.spaceIds,space.id]:p.spaceIds.filter(id=>id!==space.id),
          }))}/><span>{space.name}</span></label>)}</div>
            : <p>Não há cômodos cadastrados. Você pode criar o projeto mesmo assim.</p>}
          <small>Um projeto pode envolver vários ambientes ou nenhum, como um deck planejado.</small>
        </fieldset>
        {editorError&&<p className="auth-alert" role="alert">{editorError}</p>}
        <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={closeEditor}>Cancelar</button><button type="submit" className="btn btn-primary"><Check size={17}/>Salvar projeto</button></div>
      </form>
    </Modal>}
  </section>;
}
