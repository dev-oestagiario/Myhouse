import type { HomeData, ProjectScenario, Room, ScenarioRevision, ScenarioFurniture } from '../../types';
import { validateHome } from '../../data';
import { scaleRoomGeometry, validateRoomGeometry } from '../../plan/geometry';

export type ScenarioStart = 'projeto'|'vazio';
function editable(home:HomeData,projectId:string) {
  const project=home.projects.find(item=>item.id===projectId);
  if(!project)throw new Error('Projeto não encontrado.');
  if(project.archivedAt)throw new Error('Reative o projeto para editar cenários.');
  return project;
}
function validMoment(value:string) {
  if(!Number.isFinite(Date.parse(value)))throw new Error('Data do cenário inválida.');
}
function checkName(name:string):string {
  const trimmed=name.trim();
  if(trimmed.length<2||trimmed.length>120)throw new Error('Nome do cenário deve ter entre 2 e 120 caracteres.');
  return trimmed;
}
function findScenario(home:HomeData,id:string):ProjectScenario {
  const scenario=home.scenarios.find(item=>item.id===id);
  if(!scenario)throw new Error('Cenário não encontrado.');
  editable(home,scenario.projectId);
  return scenario;
}
function sourceRooms(home:HomeData,projectId:string):Room[] {
  const project=editable(home,projectId);
  const roomIds=new Set(project.spaceIds.map(id=>home.spaces.find(s=>s.id===id)?.roomId).filter(Boolean));
  return structuredClone(home.rooms.filter(room=>roomIds.has(room.id)));
}
function updateHome(home:HomeData,scenario:ProjectScenario):HomeData {
  return validateHome({...home,scenarios:home.scenarios.map(item=>item.id===scenario.id?scenario:item),
    projects:home.projects.map(project=>project.id===scenario.projectId
      ?{...project,updatedAt:scenario.updatedAt}:project)});
}
function snapshot(scenario:ProjectScenario,revisionId:string,at:string,label:string):ScenarioRevision {
  return {id:revisionId,savedAt:at,label,rooms:structuredClone(scenario.rooms),furniture:structuredClone(scenario.furniture)};
}
function updateRooms(home:HomeData,scenarioId:string,rooms:Room[],revisionId:string,at:string,label:string,furniture?:ScenarioFurniture[]):HomeData {
  validMoment(at);
  const old=findScenario(home,scenarioId);
  if(!revisionId.trim() || old.revisions.some(item=>item.id===revisionId))throw new Error('Versão do cenário inválida ou duplicada.');
  const nextFurniture=furniture??old.furniture;
  if(JSON.stringify(old.rooms)===JSON.stringify(rooms)&&JSON.stringify(old.furniture)===JSON.stringify(nextFurniture))return home;
  const revised:ProjectScenario={
    ...old,rooms:structuredClone(rooms),furniture:structuredClone(nextFurniture),updatedAt:at,
    revisions:[...old.revisions,snapshot(old,revisionId,at,label)].slice(-12),
  };
  return updateHome(home,revised);
}

/** Cópia independente da planta atual, limitada aos ambientes vinculados ao projeto. */
export function createScenario(home:HomeData,projectId:string,name:string,id:string,at:string,mode:ScenarioStart):HomeData {
  validMoment(at);
  editable(home,projectId);
  if(!id.trim()||home.scenarios.some(item=>item.id===id))throw new Error('ID de cenário inválido ou duplicado.');
  const scenario:ProjectScenario={
    id,projectId,name:checkName(name),description:'',rooms:mode==='projeto'?sourceRooms(home,projectId):[],furniture:[],
    revisions:[],createdAt:at,updatedAt:at,
  };
  return validateHome({...home,scenarios:[...home.scenarios,scenario],
    projects:home.projects.map(p=>p.id===projectId?{...p,updatedAt:at}:p)});
}
export function duplicateScenario(home:HomeData,sourceId:string,id:string,name:string,at:string):HomeData {
  const source=findScenario(home,sourceId);
  validMoment(at);
  if(!id.trim()||home.scenarios.some(item=>item.id===id))throw new Error('ID de cenário inválido ou duplicado.');
  const copy:ProjectScenario={id,projectId:source.projectId,
    name:checkName(name),description:source.description,rooms:structuredClone(source.rooms),furniture:structuredClone(source.furniture),
    revisions:[],createdAt:at,updatedAt:at};
  return validateHome({...home,scenarios:[...home.scenarios,copy]});
}
export function renameScenario(home:HomeData,scenarioId:string,name:string,description:string,at:string):HomeData {
  const source=findScenario(home,scenarioId);
  validMoment(at);
  if(typeof description!=='string'||description.length>4000)throw new Error('Descrição muito longa.');
  return updateHome(home,{...source,name:checkName(name),description:description.trim(),updatedAt:at});
}
export function deleteScenario(home:HomeData,scenarioId:string):HomeData {
  findScenario(home,scenarioId);
  return validateHome({...home,scenarios:home.scenarios.filter(item=>item.id!==scenarioId)});
}
export function changeScenarioRoom(home:HomeData,scenarioId:string,room:Room,revisionId:string,at:string):HomeData {
  const old=findScenario(home,scenarioId);
  if(!old.rooms.some(item=>item.id===room.id))throw new Error('Cômodo não encontrado neste cenário.');
  validateRoomGeometry(room);
  return updateRooms(home,scenarioId,old.rooms.map(item=>item.id===room.id?room:item),
    revisionId,at,`Antes de editar ${room.name}`);
}
export function createScenarioRoom(home:HomeData,scenarioId:string,room:Room,revisionId:string,at:string):HomeData {
  const old=findScenario(home,scenarioId);
  if(old.rooms.some(item=>item.id===room.id)||home.rooms.some(item=>item.id===room.id)) {
    throw new Error('Novo cômodo não pode reutilizar um ID existente.');
  }
  validateRoomGeometry(room);
  return updateRooms(home,scenarioId,[...old.rooms,room],revisionId,at,`Antes de adicionar ${room.name}`);
}
export function resizeScenarioRoom(home:HomeData,scenarioId:string,roomId:string,params:{
  name:string;width:number;length:number;height:number;x:number;z:number;
},revisionId:string,at:string):HomeData {
  const old=findScenario(home,scenarioId);
  const original=old.rooms.find(item=>item.id===roomId);
  if(!original)throw new Error('Cômodo do cenário não encontrado.');
  if(!params.name.trim()||params.name.length>180)throw new Error('Nome de cômodo inválido.');
  const resized=scaleRoomGeometry(original,params.width,params.length);
  const next:Room={...resized,name:params.name.trim(),height:params.height,x:params.x,z:params.z};
  validateRoomGeometry(next);
  return changeScenarioRoom(home,scenarioId,next,revisionId,at);
}
export function removeScenarioRoom(home:HomeData,scenarioId:string,roomId:string,revisionId:string,at:string):HomeData {
  const old=findScenario(home,scenarioId);
  const found=old.rooms.find(room=>room.id===roomId);
  if(!found)throw new Error('Cômodo não encontrado neste cenário.');
  if(old.furniture.some(item=>item.roomId===roomId))throw new Error('Remova ou realoque os móveis deste espaço antes de excluí-lo.');
  return updateRooms(home,scenarioId,old.rooms.filter(room=>room.id!==roomId),revisionId,at,
    `Antes de remover ${found.name}`);
}
export function restoreScenarioRevision(home:HomeData,scenarioId:string,oldRevisionId:string,revisionId:string,at:string):HomeData {
  const scenario=findScenario(home,scenarioId);
  const target=scenario.revisions.find(item=>item.id===oldRevisionId);
  if(!target)throw new Error('Versão não encontrada.');
  return updateRooms(home,scenarioId,structuredClone(target.rooms),revisionId,at,
    'Antes de restaurar versão anterior',structuredClone(target.furniture));
}
export function resetScenarioToActual(home:HomeData,scenarioId:string,revisionId:string,at:string):HomeData {
  const old=findScenario(home,scenarioId);
  return updateRooms(home,scenarioId,sourceRooms(home,old.projectId),revisionId,at,
    'Antes de recriar a proposta a partir da planta atual',[]);
}

/** Cada edição confirmada cria revisão única contendo planta e móveis. */
export function addScenarioFurniture(home:HomeData,scenarioId:string,item:ScenarioFurniture,revisionId:string,at:string):HomeData {
  const scenario=findScenario(home,scenarioId);
  if(scenario.furniture.some(other=>other.id===item.id))throw new Error('Já existe um móvel com este identificador.');
  return updateRooms(home,scenarioId,scenario.rooms,revisionId,at,'Antes de adicionar '+item.name,
    [...scenario.furniture,item]);
}
export function updateScenarioFurniture(home:HomeData,scenarioId:string,item:ScenarioFurniture,revisionId:string,at:string):HomeData {
  const scenario=findScenario(home,scenarioId);
  const before=scenario.furniture.find(other=>other.id===item.id);
  if(!before)throw new Error('Móvel não encontrado.');
  return updateRooms(home,scenarioId,scenario.rooms,revisionId,at,'Antes de editar '+before.name,
    scenario.furniture.map(other=>other.id===item.id?item:other));
}
export function removeScenarioFurniture(home:HomeData,scenarioId:string,id:string,revisionId:string,at:string):HomeData {
  const scenario=findScenario(home,scenarioId);
  const item=scenario.furniture.find(other=>other.id===id);
  if(!item)throw new Error('Móvel não encontrado.');
  return updateRooms(home,scenarioId,scenario.rooms,revisionId,at,'Antes de remover '+item.name,
    scenario.furniture.filter(other=>other.id!==id));
}
