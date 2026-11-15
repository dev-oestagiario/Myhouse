import type { Room } from '../types';
import { nextRoomPosition } from '../data';

export type RoomScanDraft = Omit<Room, 'id'>;

export const PHOTO_GUIDES = [
  { id: 'entrada', title: 'Vista da entrada', description: 'Aponte para o interior do cômodo, mostrando o encontro das paredes com o piso.' },
  { id: 'direita', title: 'Parede da direita', description: 'Mostre a parede inteira e os cantos. Afaste-se o suficiente para enquadrar o espaço.' },
  { id: 'fundo', title: 'Parede oposta', description: 'Registre a parede do fundo, de preferência com piso e teto visíveis.' },
  { id: 'esquerda', title: 'Parede da esquerda', description: 'Enquadre os limites da parede, sem precisar fotografar pessoas ou objetos pessoais.' },
  { id: 'teto', title: 'Teto e piso', description: 'Registre a altura visual do cômodo, se for possível fazer isso com segurança.' },
] as const;

export type PhotoGuideId = typeof PHOTO_GUIDES[number]['id'];

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
  return { name, width: draft.width, length: draft.length, height: draft.height, x: draft.x, z: draft.z };
}
