import type { PlanPoint, ScenarioOutdoorArea, OutdoorFinish } from '../../types';

export const OUTDOOR_FINISHES: Record<OutdoorFinish,{label:string;color:string}> = {
  madeira: {label:'Madeira (ilustrativo)',color:'#b58b5b'},
  cinza: {label:'Cinza',color:'#9faec0'},
  claro: {label:'Claro',color:'#e2d8c7'},
};
export function outdoorAreaSquareMeters(points:PlanPoint[]):number {
  return Math.abs(points.reduce((sum,p,i)=>{
    const next=points[(i+1)%points.length];
    return sum+p.x*next.z-next.x*p.z;
  },0))/2;
}
export function outdoorSignedArea(points:PlanPoint[]):number {
  return points.reduce((sum,p,i)=>{
    const next=points[(i+1)%points.length];
    return sum+p.x*next.z-next.x*p.z;
  },0)/2;
}
export function outdoorEdges(points:PlanPoint[]) {
  return points.map((from,i)=>{
    const to=points[(i+1)%points.length];
    return {index:i,from,to,length:Math.hypot(to.x-from.x,to.z-from.z)};
  });
}
export function outdoorPerimeter(points:PlanPoint[]):number {
  return outdoorEdges(points).reduce((sum,edge)=>sum+edge.length,0);
}
const cross=(a:PlanPoint,b:PlanPoint,c:PlanPoint)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
function onSegment(p:PlanPoint,a:PlanPoint,b:PlanPoint):boolean {
  return Math.abs(cross(a,b,p))<1e-8
    &&p.x>=Math.min(a.x,b.x)-1e-8&&p.x<=Math.max(a.x,b.x)+1e-8
    &&p.z>=Math.min(a.z,b.z)-1e-8&&p.z<=Math.max(a.z,b.z)+1e-8;
}
function segmentsMeet(a:PlanPoint,b:PlanPoint,c:PlanPoint,d:PlanPoint):boolean {
  const abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b);
  if(((abC>0&&abD<0)||(abC<0&&abD>0))
    &&((cdA>0&&cdB<0)||(cdA<0&&cdB>0)))return true;
  return onSegment(c,a,b)||onSegment(d,a,b)||onSegment(a,c,d)||onSegment(b,c,d);
}
/** Recusa auto-interseções, áreas degeneradas e polígonos de dimensões absurdas. */
export function validateOutdoorOutline(points:PlanPoint[]):void {
  if(!Array.isArray(points)||points.length<3||points.length>16
    ||points.some(p=>!p||typeof p.x!=='number'||typeof p.z!=='number'
      ||!Number.isFinite(p.x)||!Number.isFinite(p.z)
      ||Math.abs(p.x)>100||Math.abs(p.z)>100)){
    throw new Error('Contorno externo inválido: use de 3 a 16 vértices em metros.');
  }
  const edges=outdoorEdges(points);
  if(edges.some(edge=>edge.length<0.1))throw new Error('Vértices externos muito próximos ou repetidos.');
  if(outdoorAreaSquareMeters(points)<0.25)throw new Error('Área externa mínima: 0,25 m².');
  if(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x))>100
    ||Math.max(...points.map(p=>p.z))-Math.min(...points.map(p=>p.z))>100){
    throw new Error('O contorno externo excede 100 m.');
  }
  for(let i=0;i<edges.length;i++){
    for(let j=i+1;j<edges.length;j++){
      if(j===i+1||(i===0&&j===edges.length-1))continue;
      if(segmentsMeet(edges[i].from,edges[i].to,edges[j].from,edges[j].to)){
        throw new Error('O contorno externo cruza sobre si mesmo.');
      }
    }
  }
}
/** Validação aplicada tanto à planta ativa quanto a cada revisão importada. */
export function validateOutdoorAreas(items:unknown):void {
  if(items===undefined)return; // backup de cenário V2 criado antes da F6.6
  if(!Array.isArray(items)||items.length>12)throw new Error('Áreas externas inválidas ou acima do limite de 12.');
  const ids=new Set<string>();
  for(const area of items){
    if(!area||typeof area!=='object'
      ||typeof area.id!=='string'||!area.id.trim()||area.id.length>160||ids.has(area.id)
      ||typeof area.name!=='string'||area.name.trim().length<2||area.name.length>120
      ||![area.x,area.z,area.level,area.thickness].every(Number.isFinite)
      ||Math.abs(area.x)>100||Math.abs(area.z)>100||area.level< -2||area.level>5
      ||area.thickness<0.08||area.thickness>0.6
      ||!Object.prototype.hasOwnProperty.call(OUTDOOR_FINISHES,area.finish)
      ||!Array.isArray(area.railingEdges)||!Array.isArray(area.outline)){
      throw new Error('Área externa inválida: confira nome, localização, cota e acabamento.');
    }
    ids.add(area.id);
    validateOutdoorOutline(area.outline);
    if(area.railingEdges.length>area.outline.length
      ||new Set(area.railingEdges).size!==area.railingEdges.length
      ||area.railingEdges.some((index:unknown)=>!Number.isInteger(index as number)||Number(index)<0||Number(index)>=area.outline.length)
      ||(area.stepsEdge!==null&&(!Number.isInteger(area.stepsEdge)||area.stepsEdge<0||area.stepsEdge>=area.outline.length))){
      throw new Error('Acessórios do deck referenciam arestas inexistentes.');
    }
  }
}
export function newOutdoorArea(id:string):ScenarioOutdoorArea {
  return {
    id,name:'Deck planejado',outline:[{x:0,z:0},{x:4,z:0},{x:4,z:3},{x:0,z:3}],
    x:0,z:0,level:0,thickness:0.16,finish:'madeira',railingEdges:[],stepsEdge:null,
  };
}
export function outlinePreset(type:'retangular'|'L'):PlanPoint[] {
  return type==='retangular'
    ?[{x:0,z:0},{x:4,z:0},{x:4,z:3},{x:0,z:3}]
    :[{x:0,z:0},{x:4,z:0},{x:4,z:1.6},{x:2.4,z:1.6},{x:2.4,z:3},{x:0,z:3}];
}
