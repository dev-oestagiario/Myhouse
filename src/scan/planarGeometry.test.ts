import { describe, expect, it } from 'vitest';
import { calibrateFloor, reconstructFloorPlan, type ImagePoint } from './planarGeometry';
import { validateRoomGeometry } from '../plan/geometry';

const tile: ImagePoint[] = [
  {x:.2,y:.2},{x:.4,y:.2},{x:.4,y:.4},{x:.2,y:.4},
];
const room: ImagePoint[] = [
  {x:.1,y:.1},{x:.6,y:.1},{x:.6,y:.6},{x:.1,y:.6},
];

describe('reconstrução plana calibrada sem ARCore',()=>{
  it('usa uma referência de tamanho físico conhecido, nunca pixels como metros',()=>{
    const result=reconstructFloorPlan(tile,.6,.6,room);
    expect(result.method).toBe('calibrated-floor-homography');
    expect(result.width).toBeCloseTo(1.5,5);
    expect(result.length).toBeCloseTo(1.5,5);
    expect(result.area).toBeCloseTo(2.25,5);
    expect(result.perimeter).toBeCloseTo(6,5);
    expect(()=>validateRoomGeometry({id:'test',name:'Sala',height:2.7,x:0,z:0,...result})).not.toThrow();
  });
  it('corrige perspectiva no plano do piso',()=>{
    const perspective:ImagePoint[]=[
      {x:.3,y:.2},{x:.65,y:.25},{x:.77,y:.77},{x:.12,y:.71},
    ];
    const map=calibrateFloor(perspective,.6,.4);
    const mapped=perspective.map(map);
    expect(mapped[0].x).toBeCloseTo(0,5);
    expect(mapped[1].x).toBeCloseTo(.6,5);
    expect(mapped[2].z).toBeCloseTo(.4,5);
    expect(mapped[3].x).toBeCloseTo(0,5);
    const result=reconstructFloorPlan(perspective,.6,.4,perspective);
    expect(result.width).toBeCloseTo(.6,5);
    expect(result.length).toBeCloseTo(.4,5);
  });
  it('normaliza o sentido dos cantos do cômodo',()=>{
    const result=reconstructFloorPlan(tile,.6,.6,[...room].reverse());
    expect(result.footprint[0].x).toBeGreaterThanOrEqual(0);
    expect(result.area).toBeCloseTo(2.25,5);
  });
  it('não aceita referência ausente, degenerada ou fora do quadro',()=>{
    expect(()=>reconstructFloorPlan(tile,.0,.6,room)).toThrow('referência');
    expect(()=>reconstructFloorPlan(tile,.6,Infinity,room)).toThrow();
    expect(()=>reconstructFloorPlan([{x:.2,y:.2}, {x:.21,y:.2}, {x:.21,y:.21}, {x:.2,y:.21}],.6,.6,room)).toThrow();
    expect(()=>reconstructFloorPlan(tile,.6,.6,[{x:-.1,y:.1},...room.slice(1)])).toThrow();
  });
  it('rejeita auto-interseção e geometria não confiável',()=>{
    const crossing=[room[0],room[2],room[1],room[3]];
    expect(()=>reconstructFloorPlan(tile,.6,.6,crossing)).toThrow();
    expect(()=>reconstructFloorPlan(tile,.6,.6,room.slice(0,2))).toThrow();
    expect(()=>reconstructFloorPlan(tile,.6,.6,Array(25).fill(room[0]))).toThrow();
  });
  it('não inventa dimensões quando não existe referência calibrada',()=>{
    expect(()=>reconstructFloorPlan([],1,1,room)).toThrow();
  });
});
