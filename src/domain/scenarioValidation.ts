import type { HomeData, ProjectScenario, Room } from '../types';
import { validateRoomGeometry } from '../plan/geometry';

const validId=(s:unknown):s is string=>typeof s==='string'&&s.trim().length>0&&s.length<=160;
const validDate=(s:unknown):s is string=>typeof s==='string'&&Number.isFinite(Date.parse(s));

function checkRooms(rooms:unknown,label:string):asserts rooms is Room[] {
  if(!Array.isArray(rooms)||rooms.length>40)throw new Error(label+': limite de 40 cômodos por cenário.');
  const ids=new Set<string>();
  rooms.forEach(room=>{
    if(!room||typeof room!=='object'||!validId(room.id)||ids.has(room.id)
      ||typeof room.name!=='string'||!room.name.trim()||room.name.length>180
      ||![room.x,room.z].every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=10000)){
      throw new Error(label+': cômodo inválido ou com identificador repetido.');
    }
    ids.add(room.id);
    validateRoomGeometry(room);
  });
}

/** Compatível com documentos V2 antigos, mas nunca descarta cenários malformados. */
export function validateScenarios(home:Pick<HomeData,'projects'|'scenarios'>):void {
  if(!Array.isArray(home.scenarios))throw new Error('Lista de cenários inválida.');
  const allIds=new Set<string>();
  const counts=new Map<string,number>();
  home.scenarios.forEach(scenario=>{
    if(!scenario||!validId(scenario.id)||allIds.has(scenario.id)
      ||!validId(scenario.projectId)
      ||!home.projects.some(project=>project.id===scenario.projectId)
      ||typeof scenario.name!=='string'||scenario.name.trim().length<2||scenario.name.length>120
      ||typeof scenario.description!=='string'||scenario.description.length>4000
      ||!validDate(scenario.createdAt)||!validDate(scenario.updatedAt)){
      throw new Error('Cenário inválido, duplicado ou com projeto inexistente.');
    }
    allIds.add(scenario.id);
    counts.set(scenario.projectId,(counts.get(scenario.projectId)??0)+1);
    if(counts.get(scenario.projectId)!>20)throw new Error('Limite de 20 cenários por projeto.');
    checkRooms(scenario.rooms,'Cenário');
    if(!Array.isArray(scenario.revisions)||scenario.revisions.length>12){
      throw new Error('Histórico do cenário inválido ou acima de 12 versões.');
    }
    const revisionIds=new Set<string>();
    scenario.revisions.forEach(revision=>{
      if(!revision||!validId(revision.id)||revisionIds.has(revision.id)
        ||!validDate(revision.savedAt)
        ||typeof revision.label!=='string'||!revision.label.trim()||revision.label.length>180){
        throw new Error('Versão histórica do cenário inválida ou repetida.');
      }
      revisionIds.add(revision.id);
      checkRooms(revision.rooms,'Versão histórica');
    });
  });
}

export function scenarioSummary(scenario:ProjectScenario,actual:Room[]):{
  changed:number;added:number;removed:number;untouched:number;
}{
  const before=new Map(actual.map(room=>[room.id,room]));
  const planned=new Map(scenario.rooms.map(room=>[room.id,room]));
  let changed=0,added=0,removed=0,untouched=0;
  scenario.rooms.forEach(room=>{
    const original=before.get(room.id);
    if(!original)added++;
    else if(JSON.stringify(original)===JSON.stringify(room))untouched++;
    else changed++;
  });
  actual.forEach(room=>{if(!planned.has(room.id))removed++;});
  return {changed,added,removed,untouched};
}
