import type { PlanPoint } from '../types';
import { polygonArea, validateFootprint } from '../plan/geometry';

/** Posição relativa ao vídeo renderizado, de 0 a 1 em cada eixo. */
export type ImagePoint = { x: number; y: number };
export type PlanarScan = {
  width: number;
  length: number;
  footprint: PlanPoint[];
  area: number;
  perimeter: number;
  method: 'calibrated-floor-homography';
};

/**
 * Uma câmera monocular não fornece escala métrica sozinha.
 * Quatro cantos de um retângulo real no MESMO piso (com dois lados medidos)
 * definem a transformação projetiva do plano. Não mede paredes nem altura.
 */
function isConvexReference(pts: ImagePoint[]) {
  if (pts.length !== 4 || pts.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1)) return false;
  const turns = pts.map((p, i) => {
    const b = pts[(i + 1) % 4], c = pts[(i + 2) % 4];
    return (b.x-p.x)*(c.y-b.y)-(b.y-p.y)*(c.x-b.x);
  });
  const sign = Math.sign(turns[0]);
  if (!sign || turns.some(v => Math.sign(v) !== sign || Math.abs(v) < 0.0001)) return false;
  const area = Math.abs(pts.reduce((sum, p, i) => {
    const n = pts[(i+1)%4]; return sum+p.x*n.y-n.x*p.y;
  },0)/2);
  return area >= 0.001;
}

function solveLinear(rows: number[][], values: number[]): number[] {
  const a = rows.map((r, i) => [...r, values[i]]);
  for (let k=0;k<8;k++) {
    let pivot=k;
    for (let j=k+1;j<8;j++) if (Math.abs(a[j][k])>Math.abs(a[pivot][k])) pivot=j;
    if (Math.abs(a[pivot][k]) < 1e-10) throw new Error('Referência sem perspectiva utilizável. Escolha outro enquadramento.');
    [a[k],a[pivot]]=[a[pivot],a[k]];
    for (let i=k+1;i<8;i++) {
      const factor=a[i][k]/a[k][k];
      for (let j=k;j<=8;j++) a[i][j]-=factor*a[k][j];
    }
  }
  const h=new Array<number>(8);
  for (let i=7;i>=0;i--) {
    let n=a[i][8];
    for(let j=i+1;j<8;j++) n-=a[i][j]*h[j];
    h[i]=n/a[i][i];
  }
  if (h.some(v=>!Number.isFinite(v))) throw new Error('A calibração gerou coordenadas inválidas.');
  return h;
}

export function calibrateFloor(reference: ImagePoint[], realWidth: number, realLength: number) {
  if (![realWidth,realLength].every(n=>Number.isFinite(n)&&n>=0.1&&n<=10)) {
    throw new Error('Os dois lados da referência precisam ter entre 0,10 e 10 metros.');
  }
  if (!isConvexReference(reference)) {
    throw new Error('Marque quatro cantos distintos de um retângulo no piso, em ordem ao redor dele.');
  }
  const world: PlanPoint[] = [
    {x:0,z:0},{x:realWidth,z:0},{x:realWidth,z:realLength},{x:0,z:realLength},
  ];
  const rows: number[][]=[], rhs: number[]=[];
  reference.forEach((p,i)=>{
    const {x,z}=world[i];
    rows.push([p.x,p.y,1,0,0,0,-x*p.x,-x*p.y]);
    rows.push([0,0,0,p.x,p.y,1,-z*p.x,-z*p.y]);
    rhs.push(x,z);
  });
  const h=solveLinear(rows,rhs);
  return (p: ImagePoint): PlanPoint => {
    if (!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1) {
      throw new Error('Ponto fora do enquadramento da câmera.');
    }
    const w=h[6]*p.x+h[7]*p.y+1;
    if (Math.abs(w)<1e-7) throw new Error('Ponto muito distante ou alinhado ao horizonte. Refaça o enquadramento.');
    const x=(h[0]*p.x+h[1]*p.y+h[2])/w;
    const z=(h[3]*p.x+h[4]*p.y+h[5])/w;
    if (![x,z].every(Number.isFinite)||Math.abs(x)>150||Math.abs(z)>150) {
      throw new Error('Ponto fora da região calibrada. Refaça a calibração mais perto do piso.');
    }
    return {x,z};
  };
}

/** Projeta pontos do limite entre paredes e piso em um contorno local validado. */
export function reconstructFloorPlan(
  reference: ImagePoint[], realWidth: number, realLength: number, boundary: ImagePoint[],
): PlanarScan {
  if (boundary.length < 3 || boundary.length > 24) {
    throw new Error('Marque entre 3 e 24 cantos ao redor do piso.');
  }
  const project=calibrateFloor(reference,realWidth,realLength);
  const raw=boundary.map(project);
  const minX=Math.min(...raw.map(p=>p.x)), minZ=Math.min(...raw.map(p=>p.z));
  const maxX=Math.max(...raw.map(p=>p.x)), maxZ=Math.max(...raw.map(p=>p.z));
  const width=maxX-minX, length=maxZ-minZ;
  if (width<0.1||width>100||length<0.1||length>100) {
    throw new Error('O cômodo estimado ficou fora dos limites de 0,10 a 100 metros.');
  }
  let footprint=raw.map(p=>({x:p.x-minX,z:p.z-minZ}));
  if (polygonArea(footprint)<0) footprint=footprint.reverse();
  validateFootprint({width,length,footprint});
  const area=polygonArea(footprint);
  const perimeter=footprint.reduce((sum,p,i)=>{
    const n=footprint[(i+1)%footprint.length];
    return sum+Math.hypot(n.x-p.x,n.z-p.z);
  },0);
  return {width,length,footprint,area,perimeter,method:'calibrated-floor-homography'};
}
