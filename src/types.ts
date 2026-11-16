export const DIRECTIONS = ['norte', 'sul', 'leste', 'oeste'] as const;
export type Direction = typeof DIRECTIONS[number];
export const STAGES = ['Raspagem', 'Reparo', 'Lixamento', 'Preparação', 'Pintura'] as const;
export type Stage = typeof STAGES[number];
export type TaskStatus = 'nao-iniciado' | 'em-andamento' | 'concluido';
export type Priority = 'urgente' | 'alta' | 'media' | 'baixa';

/** Coordinates in meters relative to a room's local top-left corner. */
export interface PlanPoint { x: number; z: number }

export interface WallOpening {
  id: string;
  type: 'door' | 'window';
  /** Index of the polygon boundary edge, in stored vertex order. */
  edge: number;
  /** Distance from the starting vertex of that edge, in meters. */
  offset: number;
  width: number;
  height: number;
  /** Door starts at ground level; windows have a sill in meters. */
  sill: number;
}

export interface Room {
  id: string;
  name: string;
  width: number;
  length: number;
  height: number;
  x: number;
  z: number;
  /** Optional polygon; absent means a rectangle for legacy rooms. */
  footprint?: PlanPoint[];
  /** Openings on individual polygon boundary edges. */
  openings?: WallOpening[];
}

export type PurchaseStatus = 'preciso' | 'pesquisando' | 'orcado' | 'comprado' | 'recebido' | 'instalado' | 'cancelado';
export interface PurchaseQuote {
  id: string;
  supplier: string;
  /** Cotação por unidade, em centavos. */
  unitPriceCents: number;
  url: string;
  createdAt: string;
}

export interface Purchase {
  id: string;
  name: string;
  category: string;
  roomId: string;
  priority: Priority;
  quantity: number;
  unitPrice: number;
  purchased: boolean;
  notes: string;
  url: string;
  createdAt: string;
  /** Vínculos opcionais: compras antigas permanecem independentes. */
  projectId?: string;
  taskId?: string;
  unit?: string;
  status?: PurchaseStatus;
  /** Preço realmente pago por unidade. Null/undefined = ainda não informado. */
  actualUnitPriceCents?: number | null;
  supplier?: string;
  quotes?: PurchaseQuote[];
}

export interface WorkLog {
  id: string;
  roomId: string;
  direction: Direction;
  stage: Stage;
  status: TaskStatus;
  note: string;
  createdAt: string;
}


/** Dados de versões anteriores — mantidos apenas para importação e migração. */
export interface HomeDataV1 {
  version: 1;
  rooms: Room[];
  purchases: Purchase[];
  wallStages: Record<string, Partial<Record<Stage, TaskStatus>>>;
  logs: WorkLog[];
}

export type ResidenceType = 'atual' | 'destino' | 'futura';

export interface Residence {
  id: string;
  name: string;
  type: ResidenceType;
}

export type SpaceType = 'interno' | 'externo';
export type SpaceState = 'existente' | 'planejado';

/** Interno referencia Room, que continua sendo a única fonte da geometria. */
export interface Space {
  id: string;
  residenceId: string;
  type: SpaceType;
  state: SpaceState;
  name: string;
  roomId?: string;
}

export type ProjectType = 'mudanca' | 'reforma' | 'decoracao' | 'ampliacao' | 'manutencao' | 'outro';
export type ProjectStatus = 'ideia' | 'planejando' | 'aprovado' | 'em-execucao' | 'pausado' | 'concluido' | 'cancelado';

export interface Project {
  id: string;
  residenceId: string;
  name: string;
  description: string;
  type: ProjectType;
  status: ProjectStatus;
  priority: Priority;
  spaceIds: string[];
  /** Inteiro em centavos. null = ainda não informado. */
  budgetTargetCents: number | null;
  createdAt: string;
  updatedAt: string;
  /** Arquivamento reversível: não altera status do projeto nem seu histórico. */
  archivedAt?: string;
  /** Reserva para imprevistos, percentual inteiro 0–50. */
  contingencyPercent?: number;
}

export type ProjectTaskKind = 'tarefa' | 'servico';
export type ProjectTaskStatus = 'nao-iniciado' | 'em-andamento' | 'concluido';

export interface ProjectTaskChecklistItem {
  id: string;
  title: string;
  done: boolean;
}

export interface ProjectTaskEvent {
  id: string;
  occurredAt: string;
  description: string;
}

/** Serviço ou tarefa de projeto; independente das etapas de pintura legadas. */
export interface ProjectTask {
  id: string;
  projectId: string;
  spaceId: string | null;
  kind: ProjectTaskKind;
  title: string;
  description: string;
  status: ProjectTaskStatus;
  priority: Priority;
  dueDate: string | null; // data local YYYY-MM-DD, sem converter para UTC
  checklist: ProjectTaskChecklistItem[];
  dependsOn: string[]; // IDs de tarefas do MESMO projeto
  history: ProjectTaskEvent[];
  createdAt: string;
  updatedAt: string;
  /** Somente mão de obra / serviço; materiais são compras vinculadas. */
  estimatedCostCents?: number | null;
  actualCostCents?: number | null;
}

/** Histórico reversível do desenho; snapshot isolado dos cômodos reais. */
export interface ScenarioRevision {
  id: string;
  savedAt: string;
  label: string;
  rooms: Room[];
}

/** Alternativa espacial de um projeto: nunca modifica HomeData.rooms. */
export interface ProjectScenario {
  id: string;
  projectId: string;
  name: string;
  description: string;
  rooms: Room[];
  revisions: ScenarioRevision[];
  createdAt: string;
  updatedAt: string;
}

/** V2 preserva os campos legados para não interromper os fluxos atuais. */
export interface HomeData extends Omit<HomeDataV1, 'version'> {
  version: 2;
  residences: Residence[];
  spaces: Space[];
  projects: Project[];
  workTasks: ProjectTask[];
  /** Opcional no backup V2 legado; migrado para [] ao importar. */
  scenarios: ProjectScenario[];
}
