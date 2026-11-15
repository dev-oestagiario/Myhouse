export const DIRECTIONS = ['norte', 'sul', 'leste', 'oeste'] as const;
export type Direction = typeof DIRECTIONS[number];
export const STAGES = ['Raspagem', 'Reparo', 'Lixamento', 'Preparação', 'Pintura'] as const;
export type Stage = typeof STAGES[number];
export type TaskStatus = 'nao-iniciado' | 'em-andamento' | 'concluido';
export type Priority = 'urgente' | 'alta' | 'media' | 'baixa';

export interface Room {
  id: string;
  name: string;
  width: number;
  length: number;
  height: number;
  x: number;
  z: number;
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
