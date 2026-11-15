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

export interface HomeData {
  version: 1;
  rooms: Room[];
  purchases: Purchase[];
  wallStages: Record<string, Partial<Record<Stage, TaskStatus>>>;
  logs: WorkLog[];
}
