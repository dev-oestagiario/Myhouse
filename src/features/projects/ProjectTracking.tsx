import {Feedback} from '../../shared/UiState';
import {useState} from 'react';
import {AlertTriangle,CalendarDays,Check,Clock3,History,Receipt,Wallet} from 'lucide-react';
import type {HomeData,Project} from '../../types';
import {money,newId} from '../../data';
import {projectBudget} from './budgetDomain';
import {projectTaskProgress,TASK_PRIORITY_LABELS,TASK_STATUS_LABELS,setProjectTaskStatus} from './taskDomain';
import {agendaTasks,localDateToday,phaseBudget,projectActivities,type AgendaFilter} from './trackingDomain';
import './tracking.css';

type Props={home:HomeData;project:Project;onChange:(next:HomeData)=>void;
  onOpenTasks:()=>void;onOpenBudget:()=>void;onOpenFiles:()=>void};
const brl=(cents:number)=>money(cents/100);
const shortDate=(s:string)=>s.split('-').reverse().join('/');
const shortMoment=(s:string)=>new Date(s).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});

export default function ProjectTracking({home,project,onChange,onOpenTasks,onOpenBudget,onOpenFiles}:Props){
  const tasks=home.workTasks.filter(task=>task.projectId===project.id);
  const progress=projectTaskProgress(tasks);
  const budget=projectBudget(home,project.id);
  const today=localDateToday(new Date());
  const [filter,setFilter]=useState<AgendaFilter>('todas');
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const scheduled=agendaTasks(tasks,filter,today);
  const phases=phaseBudget(home,project.id);
  const activities=projectActivities(home,project.id).slice(0,30);
  const overdue=tasks.filter(t=>t.status!=='concluido'&&t.dueDate!==null&&t.dueDate<today).length;
  const missing=tasks.filter(t=>t.status!=='concluido'&&t.dueDate===null).length;
  function finish(taskId:string){
    try{
      onChange(setProjectTaskStatus(home,taskId,'concluido',newId(),new Date().toISOString()));
      setError('');setNotice('Tarefa atualizada. Aguarde a sincronização.');
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível concluir a tarefa.');}
  }
  return <section className="tracking-workspace panel" aria-label="Acompanhamento de projeto">
    <header className="tracking-heading"><div>
      <span className="eyebrow dark-eyebrow">CONTROLE DE EXECUÇÃO</span>
      <h3>Acompanhamento do projeto</h3>
      <p>Agenda, etapas, gastos registrados e histórico. Consulte tudo sem abrir a planta 3D.</p>
    </div></header>
    {notice&&<Feedback tone="success" onDismiss={()=>setNotice('')}>{notice}</Feedback>}
    {error&&<Feedback tone="error">{error}</Feedback>}
    <div className="tracking-kpis" aria-label="Resumo da execução">
      <div><Check size={19}/><span>Progresso</span><strong>{progress.percent}%</strong><small>{progress.done} de {progress.total} concluídas</small></div>
      <div><AlertTriangle size={19}/><span>Atrasadas</span><strong>{overdue}</strong><small>{missing} sem prazo</small></div>
      <div><Wallet size={19}/><span>Previsão + reserva</span><strong>{brl(budget.forecastCents)}</strong><small>Reserva: {brl(budget.reserveCents)}</small></div>
      <div><Receipt size={19}/><span>Gasto confirmado</span><strong>{brl(budget.registeredCents)}</strong><small>{budget.confirmedItems} lançamentos com valor</small></div>
    </div>
    <div className="tracking-progress" role="progressbar" aria-label="Progresso do projeto"
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}>
      <span style={{width:progress.percent+'%'}}/>
    </div>
    <section className="tracking-section" aria-label="Agenda de atividades">
      <div className="tracking-section-heading"><div><CalendarDays size={20}/><h4>Agenda e prioridades</h4></div>
        <button className="btn btn-outline" type="button" onClick={onOpenTasks}>Gerenciar tarefas</button></div>
      <div className="tracking-filters"><label htmlFor="tracking-period">Exibir pendências
        <select id="tracking-period" value={filter} onChange={e=>setFilter(e.target.value as AgendaFilter)}>
          <option value="todas">Todas</option>
          <option value="atrasadas">Atrasadas</option>
          <option value="semana">Próximos 7 dias</option>
          <option value="mes">Próximos 30 dias</option>
          <option value="sem-prazo">Sem prazo</option>
        </select></label>
        <span>Hoje: {shortDate(today)}</span>
      </div>
      {!scheduled.length?<p className="tracking-empty">Nenhuma pendência neste período.</p>
        :<ol className="tracking-agenda">{scheduled.map(task=><li key={task.id}>
          <div className="tracking-agenda-icon"><Clock3 size={17}/></div>
          <div className="tracking-agenda-content"><strong>{task.title}</strong>
            <small>{task.phase?.trim()||'Sem etapa'} · {TASK_PRIORITY_LABELS[task.priority]} · {TASK_STATUS_LABELS[task.status]}</small>
            <span className={task.dueDate!==null&&task.dueDate<today?'tracking-overdue':''}>
              {task.dueDate===null?'Sem prazo informado':task.dueDate<today?'Atrasada desde '+shortDate(task.dueDate):'Prazo: '+shortDate(task.dueDate)}
            </span>
          </div>
          <button type="button" className="btn btn-outline" disabled={Boolean(project.archivedAt)}
            onClick={()=>finish(task.id)}>Concluir</button>
        </li>)}</ol>}
    </section>
    <section className="tracking-section" aria-label="Orçamento por etapa">
      <div className="tracking-section-heading"><div><Receipt size={20}/><h4>Orçamento por etapa</h4></div>
        <button type="button" className="btn btn-outline" onClick={onOpenBudget}>Abrir orçamento</button></div>
      {!phases.length?<p className="tracking-empty">Cadastre tarefas ou compras e informe uma etapa para acompanhar custos por fase.</p>
        :<div className="tracking-table-wrap"><table className="tracking-table">
          <thead><tr><th>Etapa</th><th>Tarefas</th><th>Materiais</th><th>Serviços</th><th>Previsto</th><th>Confirmado</th></tr></thead>
          <tbody>{phases.map(p=><tr key={p.phase}>
            <th scope="row">{p.phase}<small>{p.complete}/{p.tasks} tarefas concluídas · {p.purchases} compra(s)</small></th>
            <td>{p.tasks}</td><td>{brl(p.materialsCents)}</td><td>{brl(p.servicesCents)}</td>
            <td>{brl(p.forecastCents)}</td><td>{brl(p.actualCents)}</td>
          </tr>)}</tbody>
          <tfoot><tr><th colSpan={4}>Total sem reserva</th><td>{brl(budget.baseCents)}</td><td>{brl(budget.registeredCents)}</td></tr></tfoot>
        </table></div>}
      <p className="tracking-hint">A reserva de contingência aparece no resumo, mas não é distribuída entre etapas. Valores reais só incluem gastos informados.</p>
    </section>
    <section className="tracking-section" aria-label="Histórico do projeto">
      <div className="tracking-section-heading"><div><History size={20}/><h4>Histórico recente</h4></div>
        <button type="button" className="btn btn-outline" onClick={onOpenFiles}>Ver arquivos</button></div>
      {!activities.length?<p className="tracking-empty">Nenhuma atividade registrada.</p>
        :<ol className="tracking-history">{activities.map(activity=><li key={activity.id}>
          <time dateTime={activity.at}>{shortMoment(activity.at)}</time>
          <div><strong>{activity.title}</strong><span>{activity.description}</span></div>
        </li>)}</ol>}
    </section>
  </section>;
}
