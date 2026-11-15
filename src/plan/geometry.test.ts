import { describe, expect, it } from 'vitest';
import type { Room } from '../types';
import {
  alignRoom, getFootprint, getWallSegments, layoutWallPieces, polygonArea,
  roomShapePreset, scaleRoomGeometry, validateRoomGeometry, boundsOverlap,
} from './geometry';

const room: Room = { id: 'r1', name: 'Sala', width: 5, length: 4, height: 2.8, x: 1, z: 2 };
const opening = { id: 'o1', type: 'door' as const, edge: 0, offset: 2, width: 0.9, sill: 0, height: 2.1 };

describe('planta detalhada compatível com os cômodos existentes', () => {
  it('mantém cômodo sem planta personalizada como retângulo original', () => {
    expect(getFootprint(room)).toEqual([{ x: 0, z: 0 }, { x: 5, z: 0 }, { x: 5, z: 4 }, { x: 0, z: 4 }]);
    expect(polygonArea(getFootprint(room))).toBe(20);
    expect(getWallSegments(room).map(s => s.direction)).toEqual(['norte', 'leste', 'sul', 'oeste']);
    expect(validateRoomGeometry(room)).toBe(room);
  });

  it.each(['rectangle', 'L', 'U'] as const)('gera predefinição %s dentro das medidas', shape => {
    const footprint = roomShapePreset(shape, room.width, room.length);
    const detailed = { ...room, footprint };
    expect(validateRoomGeometry(detailed)).toBe(detailed);
    expect(polygonArea(footprint)).toBeGreaterThan(0.2);
    expect(polygonArea(footprint)).toBeLessThanOrEqual(room.width * room.length);
  });

  it('rejeita polígono auto-intersectado e vértices incompatíveis', () => {
    expect(() => validateRoomGeometry({ ...room, footprint: [
      { x: 0, z: 0 }, { x: 5, z: 4 }, { x: 5, z: 0 }, { x: 0, z: 4 },
    ] })).toThrow();
    expect(() => validateRoomGeometry({ ...room, footprint: [
      { x: 0, z: 0 }, { x: 5.1, z: 0 }, { x: 5, z: 4 }, { x: 0, z: 4 },
    ] })).toThrow();
  });

  it('rejeita abertura fora da parede, acima do pé-direito ou sobreposta', () => {
    expect(() => validateRoomGeometry({ ...room, openings: [{ ...opening, offset: 4.6 }] })).toThrow();
    expect(() => validateRoomGeometry({ ...room, openings: [{ ...opening, height: 3 }] })).toThrow();
    expect(() => validateRoomGeometry({ ...room, openings: [opening, { ...opening, id: 'o2', offset: 2.4 }] })).toThrow();
    expect(() => validateRoomGeometry({ ...room, openings: [{ ...opening, edge: 99 }] })).toThrow();
  });

  it('recorta porta e janela da parede sem alterar a área total', () => {
    const withOpenings: Room = { ...room, openings: [
      opening, { id: 'w', type: 'window', edge: 0, offset: 3.2, width: 1, sill: 1, height: 1.15 },
    ] };
    validateRoomGeometry(withOpenings);
    const pieces = layoutWallPieces(withOpenings, 0);
    const originalArea = 5 * 2.8;
    const openingsArea = (0.9 * 2.1) + (1 * 1.15);
    const piecesArea = pieces.reduce((n,p) => n + (p.end-p.start)*(p.top-p.bottom), 0);
    expect(piecesArea).toBeCloseTo(originalArea - openingsArea, 4);
    expect(pieces.length).toBeGreaterThan(2);
  });

  it('redimensiona planta e vãos proporcionalmente sem perdê-los', () => {
    const shape = roomShapePreset('L', 5, 4);
    const input: Room = { ...room, footprint: shape, openings: [opening] };
    const scaled = scaleRoomGeometry(input, 10, 8);
    expect(scaled.footprint?.[1].x).toBe(10);
    expect(scaled.openings?.[0].offset).toBe(4);
    expect(scaled.openings?.[0].width).toBe(1.8);
    expect(() => validateRoomGeometry(scaled)).not.toThrow();
  });

  it('alinha cômodos em relação aos limites sem sobrepor a área ocupada', () => {
    const target: Room = { ...room, id: 'other', x: -2, z: 5 };
    const result = alignRoom(room, target, 'east', 0.2);
    expect(result.x).toBeCloseTo(target.x + target.width + 0.2);
    expect(result.z).toBe(target.z);
    expect(boundsOverlap(result, target)).toBe(false);
  });

  it('detecta interseção de caixas delimitadoras como alerta, não como alteração automática', () => {
    expect(boundsOverlap(room, { ...room, id: 'near', x: 1.1 })).toBe(true);
    expect(boundsOverlap(room, { ...room, id: 'far', x: 12 })).toBe(false);
  });
});
