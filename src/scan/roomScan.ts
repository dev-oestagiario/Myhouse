import type { Room } from '../types';
import { nextRoomPosition } from '../data';
import { validateRoomGeometry } from '../plan/geometry';

export type RoomScanDraft = Omit<Room, 'id'>;

export function makeDefaultScanDraft(existingRooms: Room[]): RoomScanDraft {
  return {
    name: '',
    width: 3,
    length: 3,
    height: 2.7,
    ...nextRoomPosition(existingRooms),
  };
}

export function verifyScanDraft(draft: RoomScanDraft): RoomScanDraft {
  const name = draft.name.trim();
  if (!name || name.length > 80) {
    throw new Error('Informe um nome para o cômodo com até 80 caracteres.');
  }
  for (const [label, value] of [
    ['Largura', draft.width],
    ['Comprimento', draft.length],
    ['Altura', draft.height],
  ] as const) {
    if (!Number.isFinite(value) || value < 0.1 || value > 100) {
      throw new Error(label + ' precisa estar entre 0,10 m e 100 m.');
    }
  }
  for (const [label, value] of [['X', draft.x], ['Z', draft.z]] as const) {
    if (!Number.isFinite(value) || value < -100 || value > 100) {
      throw new Error('Posição ' + label + ' precisa estar entre -100 m e 100 m.');
    }
  }
  const verified: RoomScanDraft = { ...draft, name };
  validateRoomGeometry({ ...verified, id: 'scan-preview' });
  return verified;
}
