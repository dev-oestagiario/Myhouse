import type { HomeData, Priority, Room, Direction, Stage, TaskStatus } from './types';
import { makeDefaultResidence, migrateHome } from './domain/homeMigration';
import { STAGES } from './types';

export const STORAGE_KEY = 'casa-em-ordem-v1';
export const initialHome: HomeData = {
  version: 2,
  rooms: [],
  purchases: [],
  wallStages: {},
  logs: [],
  residences: [makeDefaultResidence()],
  spaces: [],
  projects: [],
  workTasks: [],
};

export const priorityNames: Record<Priority, string> = {
  urgente: 'Urgente', alta: 'Alta', media: 'Média', baixa: 'Baixa',
};
export const statusNames: Record<TaskStatus, string> = {
  'nao-iniciado': 'Não iniciado', 'em-andamento': 'Em andamento', concluido: 'Concluído',
};
export const directionNames: Record<Direction, string> = {
  norte: 'Norte', sul: 'Sul', leste: 'Leste', oeste: 'Oeste',
};
export const priorityOrder: Record<Priority, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 };
export const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
export const number = (value: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
export const wallId = (roomId: string, direction: Direction) => `${roomId}:${direction}`;
export const percentDone = (stages: Partial<Record<Stage, TaskStatus>> = {}) =>
  Math.round((STAGES.filter(step => stages[step] === 'concluido').length / STAGES.length) * 100);
export function nextStage(stages: Partial<Record<Stage, TaskStatus>> = {}): Stage | null {
  return STAGES.find(step => stages[step] !== 'concluido') ?? null;
}
export const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export function loadHome(): HomeData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(initialHome);
  // Dados inválidos não devem ser silenciosamente substituídos por uma casa vazia.
  return validateHome(JSON.parse(raw));
}

export function validateHome(data: unknown): HomeData {
  return migrateHome(data);
}

export function nextRoomPosition(rooms: Room[]): { x: number, z: number } {
  if (!rooms.length) return { x: 0, z: 0 };
  return { x: Math.max(...rooms.map(room => room.x + room.width)), z: 0 };
}
