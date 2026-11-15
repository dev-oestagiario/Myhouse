import type { Direction, PlanPoint, Room, WallOpening } from '../types';

export type ShapePreset = 'rectangle' | 'L' | 'U';
export type AlignmentSide = 'north' | 'south' | 'east' | 'west';
export type RoomWallSegment = { edge: number; from: PlanPoint; to: PlanPoint; length: number; direction: Direction };
export type WallPiece = { start: number; end: number; bottom: number; top: number };

const EPS = 1e-6;
const point = (x: number, z: number): PlanPoint => ({ x, z });

/** Legacy rooms render exactly as their existing 4-wall rectangles. */
export function getFootprint(room: Pick<Room, 'width' | 'length' | 'footprint'>): PlanPoint[] {
  return room.footprint ?? [point(0, 0), point(room.width, 0), point(room.width, room.length), point(0, room.length)];
}

export function roomShapePreset(preset: ShapePreset, width: number, length: number): PlanPoint[] {
  if (preset === 'L') {
    return [
      point(0, 0), point(width, 0), point(width, length * 0.56),
      point(width * 0.56, length * 0.56), point(width * 0.56, length), point(0, length),
    ];
  }
  if (preset === 'U') {
    return [
      point(0, 0), point(width, 0), point(width, length),
      point(width * 0.72, length), point(width * 0.72, length * 0.44),
      point(width * 0.28, length * 0.44), point(width * 0.28, length), point(0, length),
    ];
  }
  return [point(0, 0), point(width, 0), point(width, length), point(0, length)];
}

export function polygonArea(points: PlanPoint[]): number {
  return points.reduce((sum, p, index) => {
    const n = points[(index + 1) % points.length];
    return sum + p.x * n.z - n.x * p.z;
  }, 0) / 2;
}

const cross = (a: PlanPoint, b: PlanPoint, c: PlanPoint) =>
  (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);

const between = (a: PlanPoint, b: PlanPoint, p: PlanPoint) =>
  p.x >= Math.min(a.x, b.x) - EPS && p.x <= Math.max(a.x, b.x) + EPS &&
  p.z >= Math.min(a.z, b.z) - EPS && p.z <= Math.max(a.z, b.z) + EPS;

function segmentsIntersect(a: PlanPoint, b: PlanPoint, c: PlanPoint, d: PlanPoint): boolean {
  const c1 = cross(a, b, c);
  const c2 = cross(a, b, d);
  const c3 = cross(c, d, a);
  const c4 = cross(c, d, b);
  if (((c1 > EPS && c2 < -EPS) || (c1 < -EPS && c2 > EPS)) &&
      ((c3 > EPS && c4 < -EPS) || (c3 < -EPS && c4 > EPS))) return true;
  return (Math.abs(c1) <= EPS && between(a, b, c)) ||
    (Math.abs(c2) <= EPS && between(a, b, d)) ||
    (Math.abs(c3) <= EPS && between(c, d, a)) ||
    (Math.abs(c4) <= EPS && between(c, d, b));
}

export function validateFootprint(room: Pick<Room, 'width' | 'length' | 'footprint'>): PlanPoint[] {
  const pts = getFootprint(room);
  if (pts.length < 3 || pts.length > 24) throw new Error('O contorno precisa ter entre 3 e 24 vértices.');
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], next = pts[(i + 1) % pts.length];
    if (![p.x, p.z].every(Number.isFinite) ||
        p.x < -EPS || p.z < -EPS || p.x > room.width + EPS || p.z > room.length + EPS) {
      throw new Error('Os vértices devem estar dentro das medidas do cômodo.');
    }
    if (Math.hypot(p.x - next.x, p.z - next.z) < 0.1 - EPS) {
      throw new Error('Cada segmento da planta precisa ter pelo menos 0,10 m.');
    }
  }
  const minX = Math.min(...pts.map(p => p.x));
  const maxX = Math.max(...pts.map(p => p.x));
  const minZ = Math.min(...pts.map(p => p.z));
  const maxZ = Math.max(...pts.map(p => p.z));
  if (Math.abs(minX) > .005 || Math.abs(minZ) > .005 ||
      Math.abs(maxX - room.width) > .005 || Math.abs(maxZ - room.length) > .005) {
    throw new Error('O contorno deve tocar as bordas de largura e comprimento do cômodo.');
  }
  if (polygonArea(pts) < 0.01) {
    throw new Error('Contorno inválido: desenhe os pontos em ordem ao redor do cômodo, sem cruzamentos.');
  }
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    for (let k = i + 1; k < pts.length; k++) {
      const l = (k + 1) % pts.length;
      if (i === k || j === k || l === i) continue;
      if (segmentsIntersect(pts[i], pts[j], pts[k], pts[l])) {
        throw new Error('Contorno inválido: as paredes não podem se cruzar.');
      }
    }
  }
  return pts;
}

export function getWallSegments(room: Pick<Room, 'width' | 'length' | 'footprint'>): RoomWallSegment[] {
  const vertices = getFootprint(room);
  return vertices.map((from, edge) => {
    const to = vertices[(edge + 1) % vertices.length];
    const dx = to.x - from.x, dz = to.z - from.z;
    // A valid polygon is oriented clockwise on the screen (positive x/z area);
    // its exterior normal is (dz, -dx), grouped to the 4 existing work categories.
    const nx = dz, nz = -dx;
    const direction: Direction = Math.abs(nx) > Math.abs(nz)
      ? (nx > 0 ? 'leste' : 'oeste')
      : (nz > 0 ? 'sul' : 'norte');
    return { edge, from, to, length: Math.hypot(dx, dz), direction };
  });
}

export function validateRoomGeometry(room: Room): Room {
  if (![room.width, room.length, room.height].every(value =>
    Number.isFinite(value) && value >= 0.1 && value <= 100)) {
    throw new Error('Largura, comprimento e altura devem estar entre 0,10 e 100 m.');
  }
  const points = validateFootprint(room);
  const segments = getWallSegments(room);
  const openings = room.openings ?? [];
  if (openings.length > 50) throw new Error('Limite de 50 portas/janelas por cômodo.');
  const ids = new Set<string>();
  openings.forEach(o => {
    if (typeof o.id !== 'string' || !o.id || ids.has(o.id)) throw new Error('Identificador de vão inválido ou repetido.');
    ids.add(o.id);
    if (o.type !== 'door' && o.type !== 'window') throw new Error('Tipo de vão inválido.');
    if (!Number.isInteger(o.edge) || o.edge < 0 || o.edge >= points.length) throw new Error('Parede do vão inválida.');
    const wallLength = segments[o.edge].length;
    if (![o.offset,o.width,o.height,o.sill].every(Number.isFinite) ||
      o.offset < 0 || o.width < 0.2 || o.height < 0.2 || o.sill < 0 ||
      o.offset + o.width > wallLength + EPS ||
      o.sill + o.height > room.height + EPS) {
      throw new Error('Porta/janela fora das dimensões da parede.');
    }
    if (o.type === 'door' && o.sill > EPS) throw new Error('A porta deve começar no piso (altura zero).');
  });
  for (let i = 0; i < openings.length; i++) {
    for (let j = i + 1; j < openings.length; j++) {
      const a = openings[i], b = openings[j];
      if (a.edge !== b.edge) continue;
      if (Math.min(a.offset+a.width,b.offset+b.width) - Math.max(a.offset,b.offset) > EPS &&
          Math.min(a.sill+a.height,b.sill+b.height) - Math.max(a.sill,b.sill) > EPS) {
        throw new Error('Portas e janelas não podem se sobrepor na mesma parede.');
      }
    }
  }
  return room;
}

/** Rectangular wall tessellation; cells covered by openings are omitted. */
export function layoutWallPieces(room: Room, edge: number): WallPiece[] {
  const segment = getWallSegments(room)[edge];
  if (!segment) return [];
  const openings = (room.openings ?? []).filter(o => o.edge === edge);
  if (!openings.length) return [{ start: 0, end: segment.length, bottom: 0, top: room.height }];
  const widths = [...new Set([0,segment.length,...openings.flatMap(o=>[o.offset,o.offset+o.width])])].sort((a,b)=>a-b);
  const heights = [...new Set([0,room.height,...openings.flatMap(o=>[o.sill,o.sill+o.height])])].sort((a,b)=>a-b);
  const pieces: WallPiece[] = [];
  for (let x = 1; x < widths.length; x++) {
    for (let y = 1; y < heights.length; y++) {
      const start=widths[x-1], end=widths[x], bottom=heights[y-1], top=heights[y];
      if (end-start <= EPS || top-bottom <= EPS) continue;
      const cx=(start+end)/2,cy=(bottom+top)/2;
      if (openings.some(o=>cx>o.offset-EPS&&cx<o.offset+o.width+EPS&&cy>o.sill-EPS&&cy<o.sill+o.height+EPS)) continue;
      pieces.push({start,end,bottom,top});
    }
  }
  return pieces;
}

/** Preserve openings and polygon vertices when the legacy room edit form resizes a room. */
export function scaleRoomGeometry(room: Room, width: number, length: number): Room {
  if (![width,length].every(n=>Number.isFinite(n)&&n>=0.1&&n<=100)) throw new Error('Medidas inválidas.');
  const next: Room = { ...room, width, length };
  if (room.footprint) next.footprint = room.footprint.map(p=>({x:p.x*width/room.width,z:p.z*length/room.length}));
  if (room.openings) {
    const before = getWallSegments(room);
    const after = getWallSegments(next);
    next.openings = room.openings.map(o=>{
      const scale=after[o.edge].length/before[o.edge].length;
      return {...o,offset:o.offset*scale,width:o.width*scale};
    });
  }
  return validateRoomGeometry(next);
}

export function alignRoom(room: Room, target: Room, side: AlignmentSide, gap: number): Room {
  if (!Number.isFinite(gap) || gap < 0 || gap > 20) throw new Error('Espaçamento inválido (0 a 20 m).');
  switch (side) {
    case 'east': return { ...room, x: target.x + target.width + gap, z: target.z };
    case 'west': return { ...room, x: target.x - room.width - gap, z: target.z };
    case 'north': return { ...room, x: target.x, z: target.z - room.length - gap };
    case 'south': return { ...room, x: target.x, z: target.z + target.length + gap };
  }
}

export function boundsOverlap(a: Room, b: Room): boolean {
  return Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>EPS &&
    Math.min(a.z+a.length,b.z+b.length)-Math.max(a.z,b.z)>EPS;
}

export function openingPreview(o: WallOpening, segment: RoomWallSegment): [PlanPoint,PlanPoint] {
  const t1=o.offset/segment.length,t2=(o.offset+o.width)/segment.length;
  return [
    point(segment.from.x+(segment.to.x-segment.from.x)*t1, segment.from.z+(segment.to.z-segment.from.z)*t1),
    point(segment.from.x+(segment.to.x-segment.from.x)*t2, segment.from.z+(segment.to.z-segment.from.z)*t2),
  ];
}
