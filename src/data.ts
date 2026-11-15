import type { HomeData, Priority, Room, Direction, Stage, TaskStatus } from './types';
import { STAGES } from './types';
import { validateRoomGeometry } from './plan/geometry';

export const STORAGE_KEY = 'casa-em-ordem-v1';
export const initialHome: HomeData = {
  version: 1,
  rooms: [],
  purchases: [],
  wallStages: {},
  logs: [],
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
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(initialHome);
    return validateHome(JSON.parse(raw));
  } catch {
    return structuredClone(initialHome);
  }
}
export function validateHome(data: unknown): HomeData {
  if (!data || typeof data !== 'object') throw new Error('Arquivo inválido');
  const obj = data as Partial<HomeData>;
  if (obj.version !== 1 || !Array.isArray(obj.rooms) || !Array.isArray(obj.purchases) || !Array.isArray(obj.logs) || !obj.wallStages || typeof obj.wallStages !== 'object') {
    throw new Error('Formato do backup incompatível');
  }
  for (const room of obj.rooms) {
    if (typeof room.id !== 'string' || typeof room.name !== 'string' || ![room.width, room.length, room.height, room.x, room.z].every(n => typeof n === 'number' && Number.isFinite(n))) throw new Error('Cômodos inválidos');
    if (room.width <= 0 || room.length <= 0 || room.height <= 0) throw new Error('Medidas inválidas');
    validateRoomGeometry(room);
  }
  for (const item of obj.purchases) {
    if (typeof item.id !== 'string' || typeof item.name !== 'string' || !Number.isFinite(item.quantity) || !Number.isFinite(item.unitPrice)) throw new Error('Compras inválidas');
  }
  return obj as HomeData;
}

export function nextRoomPosition(rooms: Room[]): { x: number, z: number } {
  if (!rooms.length) return { x: 0, z: 0 };
  return { x: Math.max(...rooms.map(room => room.x + room.width)), z: 0 };
}
