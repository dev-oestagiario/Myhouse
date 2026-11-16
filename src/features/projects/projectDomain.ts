import type { HomeData, Priority, Project, ProjectStatus, ProjectType } from '../../types';
import { validateHome } from '../../data';

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  reforma: 'Reforma', mudanca: 'Mudança', decoracao: 'Decoração',
  ampliacao: 'Ampliação', manutencao: 'Manutenção', outro: 'Outro',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ideia: 'Ideia', planejando: 'Planejando', aprovado: 'Aprovado',
  'em-execucao': 'Em execução', pausado: 'Pausado',
  concluido: 'Concluído', cancelado: 'Cancelado',
};

export const PROJECT_PRIORITY_LABELS: Record<Priority,string> = {
  urgente: 'Urgente', alta: 'Alta', media: 'Média', baixa: 'Baixa',
};

export type ProjectDraft = Pick<Project, 'name' | 'description' | 'type' | 'status' | 'priority' | 'spaceIds' | 'budgetTargetCents' | 'residenceId'>;

export function newProjectDraft(residenceId: string): ProjectDraft {
  return { residenceId, name: '', description: '', type: 'reforma', status: 'ideia', priority: 'media', spaceIds: [], budgetTargetCents: null };
}

/** Reais como texto -> centavos inteiros, sem ponto flutuante ou arredondamento implícito. */
export function parseBudgetCents(value: string): number | null {
  const cleaned = value.trim();
  if (!cleaned) return null;
  const normalized = cleaned.replace(',', '.');
  if (!/^(?:0|[1-9]\d{0,8})(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error('Informe um orçamento válido em reais, com até duas casas decimais.');
  }
  const [whole, fraction = ''] = normalized.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) throw new Error('Orçamento fora do limite permitido.');
  return cents;
}

export function formatBudgetInput(cents: number | null): string {
  if (cents === null) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

const typeCodes = new Set(Object.keys(PROJECT_TYPE_LABELS));
const statusCodes = new Set(Object.keys(PROJECT_STATUS_LABELS));
const priorityCodes = new Set(Object.keys(PROJECT_PRIORITY_LABELS));

export function validateProjectDraft(home: HomeData, draft: ProjectDraft): ProjectDraft {
  const name = draft.name.trim();
  const description = draft.description.trim();
  if (name.length < 2 || name.length > 120) throw new Error('O nome do projeto deve ter entre 2 e 120 caracteres.');
  if (description.length > 4000) throw new Error('A descrição pode ter até 4000 caracteres.');
  if (!home.residences.some(item => item.id === draft.residenceId)) throw new Error('Residência não encontrada.');
  if (!typeCodes.has(draft.type) || !statusCodes.has(draft.status) || !priorityCodes.has(draft.priority)) {
    throw new Error('Tipo, situação ou prioridade inválida.');
  }
  if (!Array.isArray(draft.spaceIds) || new Set(draft.spaceIds).size !== draft.spaceIds.length) {
    throw new Error('Ambientes selecionados inválidos ou repetidos.');
  }
  if (draft.spaceIds.some(id => !home.spaces.some(space => space.id === id && space.residenceId === draft.residenceId))) {
    throw new Error('Um dos ambientes não pertence à residência selecionada.');
  }
  const budget = draft.budgetTargetCents;
  if (budget !== null && (!Number.isSafeInteger(budget) || budget < 0)) {
    throw new Error('O orçamento precisa ser um valor não negativo em centavos.');
  }
  return { ...draft, name, description, spaceIds: [...draft.spaceIds] };
}

function assertTimestamp(timestamp: string) {
  if (!Number.isFinite(Date.parse(timestamp))) throw new Error('Data de alteração inválida.');
}

export function createProject(home: HomeData, draft: ProjectDraft, id: string, timestamp: string): HomeData {
  assertTimestamp(timestamp);
  if (!id.trim() || home.projects.some(item => item.id === id)) throw new Error('Identificador de projeto inválido ou duplicado.');
  const safe = validateProjectDraft(home, draft);
  const project: Project = { ...safe, id, createdAt: timestamp, updatedAt: timestamp };
  return validateHome({ ...home, projects: [project, ...home.projects] });
}

export function updateProject(home: HomeData, id: string, draft: ProjectDraft, timestamp: string): HomeData {
  assertTimestamp(timestamp);
  const current = home.projects.find(item => item.id === id);
  if (!current) throw new Error('Projeto não encontrado.');
  const safe = validateProjectDraft(home, draft);
  if (current.archivedAt) throw new Error('Reative o projeto antes de editá-lo.');
  if ((home.workTasks ?? []).some(task=>task.projectId===id && task.spaceId!==null && !safe.spaceIds.includes(task.spaceId))) {
    throw new Error('Existem tarefas vinculadas a um ambiente removido. Ajuste essas tarefas antes de desvincular o ambiente.');
  }
  return validateHome({ ...home, projects: home.projects.map(item => item.id === id
    ? { ...item, ...safe, updatedAt: timestamp } : item) });
}

export function setProjectArchived(home: HomeData, id: string, archived: boolean, timestamp: string): HomeData {
  assertTimestamp(timestamp);
  const current = home.projects.find(item => item.id === id);
  if (!current) throw new Error('Projeto não encontrado.');
  if (Boolean(current.archivedAt) === archived) return home;
  return validateHome({ ...home, projects: home.projects.map(item => {
    if (item.id !== id) return item;
    const updated = { ...item, updatedAt: timestamp };
    if (archived) return { ...updated, archivedAt: timestamp };
    const { archivedAt: _archivedAt, ...active } = updated;
    void _archivedAt;
    return active;
  }) });
}

export function deleteProject(home: HomeData, id: string): HomeData {
  if (!home.projects.some(item => item.id === id)) throw new Error('Projeto não encontrado.');
  if ((home.workTasks ?? []).some(task=>task.projectId===id)) {
    throw new Error('Este projeto possui tarefas. Exclua ou transfira as tarefas antes de excluir o projeto, ou arquive-o.');
  }
  // Compras vinculadas a projetos serão tratadas na F6.3, com integridade referencial própria.
  return validateHome({ ...home, projects: home.projects.filter(item => item.id !== id) });
}
