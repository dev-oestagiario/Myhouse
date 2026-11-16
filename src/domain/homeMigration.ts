import type { HomeData, HomeDataV1, Project, Residence, Room, Space } from '../types';
import { validateRoomGeometry } from '../plan/geometry';

export const DEFAULT_RESIDENCE_ID = 'residence-primary';

export function makeDefaultResidence(): Residence {
  return { id: DEFAULT_RESIDENCE_ID, name: 'Minha casa', type: 'atual' };
}

export function makeSpaceForRoom(room: Room, residenceId = DEFAULT_RESIDENCE_ID): Space {
  return {
    id: 'space-room:' + room.id,
    residenceId,
    type: 'interno',
    state: 'existente',
    name: room.name,
    roomId: room.id,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasName(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 160;
}

function uniqueIds(values: {id:string}[], label: string) {
  if (new Set(values.map(value => value.id)).size !== values.length) {
    throw new Error(label + ': identificadores duplicados.');
  }
}

function validateLegacyFields(raw: Record<string, unknown>) {
  if (!Array.isArray(raw.rooms) || !Array.isArray(raw.purchases) || !Array.isArray(raw.logs)
    || !isObject(raw.wallStages)) {
    throw new Error('Formato do backup incompatível.');
  }
  const rooms = raw.rooms as Room[];
  const purchases = raw.purchases as HomeDataV1['purchases'];
  const logs = raw.logs as HomeDataV1['logs'];
  const wallStages = raw.wallStages as HomeDataV1['wallStages'];
  for (const room of rooms) {
    if (!isObject(room) || !hasId(room.id) || !hasName(room.name)
      || ![room.width, room.length, room.height, room.x, room.z].every(n=>typeof n==='number' && Number.isFinite(n))
      || room.width <= 0 || room.length <= 0 || room.height <= 0) {
      throw new Error('Cômodos inválidos.');
    }
    validateRoomGeometry(room);
  }
  uniqueIds(rooms, 'Cômodos');
  for (const item of purchases) {
    if (!isObject(item) || !hasId(item.id) || !hasName(item.name)
      || typeof item.category !== 'string' || typeof item.roomId !== 'string'
      || !Number.isFinite(item.quantity)
      || !Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      throw new Error('Compras inválidas.');
    }
  }
  uniqueIds(purchases, 'Compras');
  for (const log of logs) {
    if (!isObject(log) || !hasId(log.id) || typeof log.roomId !== 'string'
      || typeof log.stage !== 'string' || typeof log.direction !== 'string'
      || typeof log.createdAt !== 'string') {
      throw new Error('Registros de trabalho inválidos.');
    }
  }
  uniqueIds(logs, 'Registros de trabalho');
  return { rooms, purchases, logs, wallStages };
}

/** Mantém os vínculos Room -> Space sem duplicar geometria e preserva espaços externos. */
export function reconcileSpaces(home: HomeData): HomeData {
  const roomIds = new Set(home.rooms.map(room => room.id));
  const primaryId = home.residences.find(residence => residence.type === 'atual')?.id
    ?? home.residences[0]?.id ?? DEFAULT_RESIDENCE_ID;
  const storedIndoor = home.spaces.filter(space => space.type === 'interno' && space.roomId && roomIds.has(space.roomId));
  const byRoomId = new Map(storedIndoor.map(space => [space.roomId!, space]));
  const spaces = [
    ...home.rooms.map(room => {
      const stored = byRoomId.get(room.id);
      return stored ? { ...stored, name: room.name } : makeSpaceForRoom(room, primaryId);
    }),
    ...home.spaces.filter(space => space.type === 'externo'),
  ];
  return { ...home, spaces };
}

const PROJECT_TYPES = new Set<Project['type']>(['mudanca','reforma','decoracao','ampliacao','manutencao','outro']);
const PROJECT_STATUSES = new Set<Project['status']>(['ideia','planejando','aprovado','em-execucao','pausado','concluido','cancelado']);
const PRIORITIES = new Set<Project['priority']>(['urgente','alta','media','baixa']);

function checkV2(home: HomeData): HomeData {
  if (!Array.isArray(home.residences) || !home.residences.length
    || !Array.isArray(home.spaces) || !Array.isArray(home.projects)) {
    throw new Error('Estrutura de residências e projetos inválida.');
  }
  for (const residence of home.residences) {
    if (!isObject(residence) || !hasId(residence.id) || !hasName(residence.name)
      || !['atual','destino','futura'].includes(residence.type)) {
      throw new Error('Residência inválida.');
    }
  }
  uniqueIds(home.residences, 'Residências');
  const residenceIds = new Set(home.residences.map(item => item.id));
  const roomIds = new Set(home.rooms.map(item => item.id));
  for (const space of home.spaces) {
    if (!isObject(space) || !hasId(space.id) || !hasName(space.name)
      || !residenceIds.has(space.residenceId)
      || !['interno','externo'].includes(space.type)
      || !['existente','planejado'].includes(space.state)) {
      throw new Error('Ambiente inválido.');
    }
    if (space.type === 'interno' && (!hasId(space.roomId) || !roomIds.has(space.roomId))) {
      throw new Error('Ambiente interno sem cômodo vinculado.');
    }
    if (space.type === 'externo' && space.roomId !== undefined) {
      throw new Error('Ambiente externo não pode referenciar cômodo interno.');
    }
  }
  uniqueIds(home.spaces, 'Ambientes');
  if (new Set(home.spaces.filter(space => space.type === 'interno').map(space=>space.roomId)).size
      !== home.spaces.filter(space=>space.type==='interno').length) {
    throw new Error('Vários ambientes referenciam o mesmo cômodo.');
  }
  const spaceIds = new Set(home.spaces.map(item=>item.id));
  for (const project of home.projects) {
    if (!isObject(project) || !hasId(project.id) || !hasName(project.name)
      || typeof project.description !== 'string'
      || !residenceIds.has(project.residenceId)
      || !PROJECT_TYPES.has(project.type)
      || !PROJECT_STATUSES.has(project.status)
      || !PRIORITIES.has(project.priority)
      || !Array.isArray(project.spaceIds) || project.spaceIds.some(id=>typeof id!=='string' || !spaceIds.has(id))
      || new Set(project.spaceIds).size !== project.spaceIds.length
      || (project.budgetTargetCents !== null && (!Number.isSafeInteger(project.budgetTargetCents) || project.budgetTargetCents < 0))
      || typeof project.createdAt !== 'string' || !Number.isFinite(Date.parse(project.createdAt))
      || typeof project.updatedAt !== 'string' || !Number.isFinite(Date.parse(project.updatedAt))
      || (project.archivedAt !== undefined && (typeof project.archivedAt !== 'string' || !Number.isFinite(Date.parse(project.archivedAt))))) {
      throw new Error('Projeto inválido ou com referências inexistentes.');
    }
    if (project.spaceIds.some(id => home.spaces.find(space=>space.id===id)?.residenceId !== project.residenceId)) {
      throw new Error('Projeto não pode vincular ambientes de outra residência.');
    }
  }
  uniqueIds(home.projects, 'Projetos');
  return home;
}

/**
 * Migração sem efeitos colaterais e sem descartar campos de negócio legados.
 * V1 continua importável; a estrutura V2 é idempotente após a primeira migração.
 */
export function migrateHome(input: unknown): HomeData {
  if (!isObject(input)) throw new Error('Arquivo inválido.');
  if (input.version !== 1 && input.version !== 2) throw new Error('Versão do backup incompatível.');
  const legacy = validateLegacyFields(input);
  if (input.version === 1) {
    const result: HomeData = {
      version: 2,
      ...legacy,
      residences: [makeDefaultResidence()],
      spaces: legacy.rooms.map(room=>makeSpaceForRoom(room)),
      projects: [],
    };
    return checkV2(result);
  }
  const home = input as unknown as HomeData;
  if (!Array.isArray(home.residences) || !Array.isArray(home.spaces) || !Array.isArray(home.projects)) {
    throw new Error('Backup V2 incompleto.');
  }
  // Rejeita vínculos corrompidos ANTES da normalização: não descartar dados silenciosamente.
  const checked = checkV2({ ...home, ...legacy });
  const normalized = reconcileSpaces(checked);
  return checkV2(normalized);
}
