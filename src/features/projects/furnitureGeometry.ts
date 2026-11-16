import type { FurnitureColor, FurnitureKind, PlanPoint, Room, ScenarioFurniture } from '../../types';
import { getFootprint, getWallSegments } from '../../plan/geometry';

export type FurnitureCatalogEntry={
  kind:FurnitureKind;label:string;group:string;width:number;depth:number;height:number;color:FurnitureColor;
};
export const FURNITURE_CATALOG: FurnitureCatalogEntry[]=[
  {kind:'sofa',label:'Sofá',group:'Sala',width:2.1,depth:.85,height:.85,color:'azul'},
  {kind:'poltrona',label:'Poltrona',group:'Sala',width:.86,depth:.86,height:.86,color:'cinza'},
  {kind:'mesa',label:'Mesa',group:'Sala e cozinha',width:1.5,depth:.85,height:.75,color:'madeira'},
  {kind:'cadeira',label:'Cadeira',group:'Sala e cozinha',width:.48,depth:.53,height:.86,color:'madeira'},
  {kind:'cama',label:'Cama',group:'Quarto',width:1.4,depth:1.95,height:.58,color:'branco'},
  {kind:'guarda-roupa',label:'Guarda-roupa',group:'Quarto',width:1.75,depth:.6,height:2.3,color:'madeira'},
  {kind:'escrivaninha',label:'Escrivaninha',group:'Escritório',width:1.25,depth:.62,height:.75,color:'madeira'},
  {kind:'estante',label:'Estante',group:'Escritório',width:1.05,depth:.36,height:1.9,color:'madeira'},
  {kind:'tapete',label:'Tapete',group:'Decoração',width:1.8,depth:1.2,height:.018,color:'cinza'},
  {kind:'planta',label:'Planta decorativa',group:'Decoração',width:.42,depth:.42,height:1.25,color:'verde'},
  {kind:'armario',label:'Armário',group:'Outros',width:1.15,depth:.48,height:1.65,color:'branco'},
  {kind:'luminaria',label:'Luminária de piso',group:'Decoração',width:.42,depth:.42,height:1.6,color:'branco'},
];
export const FURNITURE_COLORS:Record<FurnitureColor,{label:string;hex:string}>={
  azul:{label:'Azul',hex:'#6f99c9'},cinza:{label:'Cinza',hex:'#9aa9bd'},
  madeira:{label:'Madeira',hex:'#b8895a'},branco:{label:'Branco',hex:'#e0e7ef'},
  verde:{label:'Verde',hex:'#6da687'},
};
export const furnitureName=(kind:FurnitureKind)=>FURNITURE_CATALOG.find(x=>x.kind===kind)?.label??'Objeto';

const EPS=1e-5;
const cross=(a:PlanPoint,b:PlanPoint,c:PlanPoint)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
const onSegment=(p:PlanPoint,a:PlanPoint,b:PlanPoint)=>{
  return Math.abs(cross(a,b,p))<EPS &&
    p.x>=Math.min(a.x,b.x)-EPS&&p.x<=Math.max(a.x,b.x)+EPS &&
    p.z>=Math.min(a.z,b.z)-EPS&&p.z<=Math.max(a.z,b.z)+EPS;
};
export function pointInsideRoom(p:PlanPoint,room:Room):boolean{
  const polygon=getFootprint(room);
  if(polygon.some((q,i)=>onSegment(p,q,polygon[(i+1)%polygon.length])))return true;
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j];
    if((a.z>p.z)!==(b.z>p.z) && p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)inside=!inside;
  }
  return inside;
}
function properCross(a:PlanPoint,b:PlanPoint,c:PlanPoint,d:PlanPoint):boolean{
  const u=cross(a,b,c),v=cross(a,b,d),w=cross(c,d,a),t=cross(c,d,b);
  return ((u>EPS&&v< -EPS)||(u< -EPS&&v>EPS))&&((w>EPS&&t< -EPS)||(w< -EPS&&t>EPS));
}
export function furnitureCorners(item:Pick<ScenarioFurniture,'x'|'z'|'rotation'|'width'|'depth'>):PlanPoint[]{
  const theta=item.rotation*Math.PI/180,c=Math.cos(theta),s=Math.sin(theta);
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>{
    const dx=u*item.width/2,dz=v*item.depth/2;
    return {x:item.x+dx*c-dz*s,z:item.z+dx*s+dz*c};
  });
}
export function furnitureFitsRoom(item:ScenarioFurniture,room:Room):boolean{
  if(!Number.isFinite(item.height)||item.height>room.height+EPS)return false;
  const corners=furnitureCorners(item),boundary=getFootprint(room);
  if(!corners.every(pt=>pointInsideRoom(pt,room)))return false;
  // Verifica também os segmentos para não atravessar reentrâncias em L/U.
  for(let i=0;i<corners.length;i++){
    const a=corners[i],b=corners[(i+1)%corners.length];
    if(!pointInsideRoom({x:(a.x+b.x)/2,z:(a.z+b.z)/2},room))return false;
    for(let j=0;j<boundary.length;j++){
      if(properCross(a,b,boundary[j],boundary[(j+1)%boundary.length]))return false;
    }
  }
  return true;
}
function axes(pts:PlanPoint[]):PlanPoint[]{
  return pts.map((a,i)=>{const b=pts[(i+1)%pts.length];return{x:-(b.z-a.z),z:b.x-a.x};});
}
export function furnitureCollide(a:ScenarioFurniture,b:ScenarioFurniture):boolean{
  if(a.roomId!==b.roomId||a.kind==='tapete'||b.kind==='tapete')return false;
  const p=furnitureCorners(a),q=furnitureCorners(b);
  return [...axes(p),...axes(q)].every(axis=>{
    const ap=p.map(x=>x.x*axis.x+x.z*axis.z),bp=q.map(x=>x.x*axis.x+x.z*axis.z);
    return Math.max(...ap)>Math.min(...bp)+.02
      && Math.max(...bp)>Math.min(...ap)+.02;
  });
}
export function furnitureCollisions(items:ScenarioFurniture[],id:string):ScenarioFurniture[]{
  const selected=items.find(x=>x.id===id);
  return selected?items.filter(other=>other.id!==id&&furnitureCollide(selected,other)):[];
}
export function validateFurniture(items:ScenarioFurniture[],rooms:Room[]):void{
  if(!Array.isArray(items)||items.length>120)throw new Error('Limite de 120 móveis por cenário.');
  const ids=new Set<string>();
  for(const item of items){
    if(!item||typeof item.id!=='string'||!item.id.trim()||item.id.length>160||ids.has(item.id)
      ||typeof item.roomId!=='string'||!rooms.some(room=>room.id===item.roomId)
      ||!FURNITURE_CATALOG.some(model=>model.kind===item.kind)
      ||typeof item.name!=='string'||!item.name.trim()||item.name.length>120
      ||!Object.prototype.hasOwnProperty.call(FURNITURE_COLORS,item.color)
      ||![item.x,item.z,item.rotation,item.width,item.depth,item.height].every(Number.isFinite)
      ||item.rotation<0||item.rotation>=360
      ||item.width<.1||item.width>6||item.depth<.1||item.depth>6
      ||item.height<.01||item.height>4){
      throw new Error('Móvel inválido: verifique tipo, medidas, posição e cor.');
    }
    ids.add(item.id);
    const room=rooms.find(room=>room.id===item.roomId)!;
    if(!furnitureFitsRoom(item,room))throw new Error(`O objeto "${item.name}" ultrapassa o contorno ou a altura do cômodo "${room.name}".`);
  }
}

/** Determina uma posição dentro do cômodo; sobreposições evitadas quando possível. */
export function placeFurniture(kind:FurnitureKind,room:Room,items:ScenarioFurniture[],id:string):ScenarioFurniture {
  const def=FURNITURE_CATALOG.find(x=>x.kind===kind);
  if(!def)throw new Error('Objeto indisponível no catálogo.');
  if(!id.trim()||items.some(x=>x.id===id))throw new Error('ID de objeto repetido.');
  const candidate:ScenarioFurniture={
    id,roomId:room.id,kind,name:def.label,width:def.width,depth:def.depth,height:def.height,
    color:def.color,rotation:0,x:room.width/2,z:room.length/2,
  };
  return findFurnitureSpot(candidate,room,items);
}

/** Duplicação conserva medidas, orientação, cor e nome do objeto editado. */
export function duplicateFurniture(source:ScenarioFurniture,room:Room,items:ScenarioFurniture[],id:string):ScenarioFurniture{
  if(!id.trim()||items.some(item=>item.id===id))throw new Error('ID de objeto repetido.');
  return findFurnitureSpot({...source,id,name:source.name+' — cópia'},room,items);
}
function findFurnitureSpot(candidate:ScenarioFurniture,room:Room,items:ScenarioFurniture[]):ScenarioFurniture{
  // Grade estável, preferindo centro, sem interação com navegador.
  const coords:PlanPoint[]=[];
  for(let x=.1;x<=room.width-.1;x+=.25)for(let z=.1;z<=room.length-.1;z+=.25)coords.push({x,z});
  coords.sort((a,b)=>Math.hypot(a.x-room.width/2,a.z-room.length/2)-Math.hypot(b.x-room.width/2,b.z-room.length/2));
  for(const pt of [{x:candidate.x,z:candidate.z},...coords]){
    const placed={...candidate,x:Math.round(pt.x*100)/100,z:Math.round(pt.z*100)/100};
    if(furnitureFitsRoom(placed,room)&&!items.some(other=>furnitureCollide(placed,other)))return placed;
  }
  throw new Error('Não foi encontrada uma posição livre para este móvel. Ajuste a disposição ou as medidas.');
}
export function alignFurnitureToWall(item:ScenarioFurniture,room:Room,edge:number,gap=.08):ScenarioFurniture {
  const wall=getWallSegments(room)[edge];
  if(!wall||!Number.isFinite(gap)||gap<0||gap>1)throw new Error('Parede ou distância de alinhamento inválida.');
  const ux=(wall.to.x-wall.from.x)/wall.length,uz=(wall.to.z-wall.from.z)/wall.length;
  const rotation=(Math.atan2(uz,ux)*180/Math.PI+360)%360;
  const mid={x:(wall.from.x+wall.to.x)/2,z:(wall.from.z+wall.to.z)/2};
  const adjusted:ScenarioFurniture={...item,rotation,
    x:mid.x-uz*(item.depth/2+gap),z:mid.z+ux*(item.depth/2+gap)};
  if(!furnitureFitsRoom(adjusted,room))throw new Error('O móvel não cabe nesta parede. Selecione outra ou reduza suas dimensões.');
  return {...adjusted,x:Math.round(adjusted.x*100)/100,z:Math.round(adjusted.z*100)/100};
}
