import {describe,expect,it} from 'vitest';
import type {HomeData,Room,ScenarioFurniture} from '../../types';
import {initialHome,validateHome} from '../../data';
import {createProject,newProjectDraft} from './projectDomain';
import {
  addScenarioFurniture,changeScenarioRoom,createScenario,deleteScenario,
  duplicateScenario,removeScenarioFurniture,removeScenarioRoom,resetScenarioToActual,
  restoreScenarioRevision,updateScenarioFurniture,
} from './scenarioDomain';
import {
  FURNITURE_CATALOG,alignFurnitureToWall,furnitureCollide,furnitureCollisions,
  furnitureCorners,furnitureFitsRoom,placeFurniture,pointInsideRoom,
} from './furnitureGeometry';
import {roomShapePreset} from '../../plan/geometry';
import {makeSpaceForRoom} from '../../domain/homeMigration';

const at='2026-11-16T12:00:00Z',next='2026-11-16T13:00:00Z';
const room:Room={id:'sala',name:'Sala',width:4.5,length:3.2,height:2.7,x:0,z:0};
function home():HomeData{
  const base:HomeData={...structuredClone(initialHome),rooms:[room],spaces:[makeSpaceForRoom(room)]};
  const project={...newProjectDraft('residence-primary'),name:'Reformar sala',spaceIds:['space-room:sala']};
  return createScenario(createProject(base,project,'projeto',at),'projeto','Sala futura','cenario',at,'projeto');
}
function withSofa(){
  const base=home();
  const sofa=placeFurniture('sofa',room,[], 'sofa-1');
  return addScenarioFurniture(base,'cenario',sofa,'rev-1',next);
}
const getScene=(data:HomeData)=>data.scenarios.find(s=>s.id==='cenario')!;

describe('F6.5 — interiores e decoração por cenário',()=>{
  it('catálogo oferece 12 objetos geométricos com dimensões válidas',()=>{
    expect(FURNITURE_CATALOG).toHaveLength(12);
    expect(new Set(FURNITURE_CATALOG.map(x=>x.kind)).size).toBe(12);
    expect(FURNITURE_CATALOG.every(x=>x.width>0&&x.depth>0&&x.height>0)).toBe(true);
  });
  it('insere sofá sem tocar na planta real e mantém móveis na versão histórica',()=>{
    const before=home(),after=withSofa();
    expect(getScene(after).furniture).toHaveLength(1);
    expect(getScene(after).furniture[0]).toMatchObject({id:'sofa-1',kind:'sofa',roomId:'sala'});
    expect(after.rooms).toEqual(before.rooms);
    expect(after.spaces).toEqual(before.spaces);
    expect(after.purchases).toEqual(before.purchases);
    expect(getScene(after).revisions[0].furniture).toEqual([]);
  });
  it('edita dimensões, posição e cor com histórico reversível e cópias independentes',()=>{
    const before=withSofa(), sofa=getScene(before).furniture[0];
    const moved=updateScenarioFurniture(before,'cenario',{...sofa,name:'Sofá azul',
      x:1.4,z:1.5,width:1.7,color:'azul',rotation:90},'rev-2',next);
    expect(getScene(moved).furniture[0]).toMatchObject({name:'Sofá azul',width:1.7,rotation:90,color:'azul'});
    expect(getScene(moved).revisions.at(-1)?.furniture[0].name).toBe('Sofá');
    const restored=restoreScenarioRevision(moved,'cenario','rev-2','rev-3',next);
    expect(getScene(restored).furniture[0]).toEqual(sofa);
    expect(getScene(restored).revisions.at(-1)?.furniture[0].name).toBe('Sofá azul');
    const dup=duplicateScenario(moved,'cenario','alternativa','Opção B',next);
    const clone=dup.scenarios.find(s=>s.id==='alternativa')!;
    expect(clone.furniture).toEqual(getScene(moved).furniture);
    expect(clone.furniture).not.toBe(getScene(moved).furniture);
    expect(clone.furniture[0]).not.toBe(getScene(moved).furniture[0]);
  });
  it('valida posições fora da sala, altura maior que o teto e contornos côncavos',()=>{
    const original=withSofa(),sofa=getScene(original).furniture[0];
    expect(()=>updateScenarioFurniture(original,'cenario',{...sofa,x:4.45},'rev-2',next)).toThrow('ultrapassa');
    expect(()=>updateScenarioFurniture(original,'cenario',{...sofa,height:3.5},'rev-2',next)).toThrow('ultrapassa');
    expect(()=>updateScenarioFurniture(original,'cenario',{...sofa,width:20},'rev-2',next)).toThrow('Móvel inválido');
    const L:Room={...room,footprint:roomShapePreset('L',room.width,room.length)};
    expect(pointInsideRoom({x:4.1,z:2.9},L)).toBe(false);
    expect(pointInsideRoom({x:.5,z:2.9},L)).toBe(true);
    expect(furnitureFitsRoom({...sofa,x:4.1,z:2.9,width:.2,depth:.2},L)).toBe(false);
    expect(furnitureCorners({...sofa,rotation:0,width:1,depth:1}).length).toBe(4);
  });
  it('verifica colisões orientadas e permite tapetes sob móveis',()=>{
    const sofa=placeFurniture('sofa',room,[],'s1');
    const twin={...sofa,id:'s2'};
    expect(furnitureCollide(sofa,twin)).toBe(true);
    expect(furnitureCollisions([sofa,twin],'s1')).toEqual([twin]);
    const beside={...twin,x:4,z:2.8};
    expect(furnitureCollide(sofa,beside)).toBe(false);
    const rug={...sofa,kind:'tapete' as const,id:'rug'};
    expect(furnitureCollide(sofa,rug)).toBe(false);
    const second=placeFurniture('cadeira',room,[sofa],'chair');
    expect(furnitureCollide(sofa,second)).toBe(false);
  });
  it('encaixa móvel na parede sem sair do contorno',()=>{
    const sofa=placeFurniture('sofa',room,[],'sofa');
    const against=alignFurnitureToWall(sofa,room,0);
    expect(against.rotation).toBe(0);
    expect(against.z).toBe(Math.round((sofa.depth/2+.08)*100)/100);
    expect(furnitureFitsRoom(against,room)).toBe(true);
    expect(()=>alignFurnitureToWall(sofa,room,99)).toThrow();
  });
  it('proíbe remover cômodo com móveis e também movimentá-los para cômodo inexistente',()=>{
    const data=withSofa();
    expect(()=>removeScenarioRoom(data,'cenario','sala','rev-remove',next)).toThrow('móveis');
    expect(()=>updateScenarioFurniture(data,'cenario',{...getScene(data).furniture[0],roomId:'outro'},'rev-2',next)).toThrow();
    const clean=removeScenarioFurniture(data,'cenario','sofa-1','rev-2',next);
    expect(getScene(clean).furniture).toEqual([]);
    expect(removeScenarioRoom(clean,'cenario','sala','rev-3',next).rooms).toEqual([room]);
  });
  it('recriar da planta real preserva os móveis antigos e a geometria no histórico',()=>{
    const data=withSofa();
    const reset=resetScenarioToActual(data,'cenario','rev-reset',next);
    expect(getScene(reset).furniture).toEqual([]);
    expect(getScene(reset).revisions.at(-1)?.furniture).toHaveLength(1);
    const undo=restoreScenarioRevision(reset,'cenario','rev-reset','rev-undo',next);
    expect(getScene(undo).furniture[0].id).toBe('sofa-1');
    expect(undo.rooms).toEqual([room]);
  });
  it('backup F6.4 sem furniture na proposta e na revisão continua válido',()=>{
    const data=withSofa();
    const old=JSON.parse(JSON.stringify(data));
    delete old.scenarios[0].furniture;
    for(const rev of old.scenarios[0].revisions)delete rev.furniture;
    const restored=validateHome(old);
    expect(restored.scenarios[0].furniture).toEqual([]);
    expect(restored.scenarios[0].revisions[0].furniture).toEqual([]);
    expect(restored.rooms).toEqual(data.rooms);
    expect(validateHome(JSON.parse(JSON.stringify(data)))).toEqual(data);
  });
  it('rejeita furniture inválida sem descartar dados ou ignorar conflito',()=>{
    const data=withSofa(),scene=getScene(data),furniture=scene.furniture[0];
    const corrupt=(f:ScenarioFurniture[])=>({...data,scenarios:[{...scene,furniture:f}]});
    expect(()=>validateHome(corrupt([furniture,furniture]))).toThrow();
    expect(()=>validateHome(corrupt([{...furniture,kind:'importado'} as ScenarioFurniture]))).toThrow();
    expect(()=>validateHome(corrupt([{...furniture,x:99}]))).toThrow();
    expect(()=>validateHome(corrupt([{...furniture,color:'hack'} as ScenarioFurniture]))).toThrow();
  });
  it('cenário arquivado é somente leitura e exclusão requer remover mobiliário junto ao cenário',()=>{
    const data=withSofa();
    const archived=validateHome({...data,projects:data.projects.map(p=>({...p,archivedAt:next}))});
    expect(()=>removeScenarioFurniture(archived,'cenario','sofa-1','rev',next)).toThrow('Reative');
    const without=deleteScenario(data,'cenario');
    expect(without.scenarios).toEqual([]);
    expect(without.rooms).toEqual([room]);
  });
  it('redesenhar parede rejeita polígono que deixa móveis do lado de fora',()=>{
    const data=withSofa();
    const L={...room,footprint:roomShapePreset('L',room.width,room.length)};
    // Móvel central ainda cabe; mover para um canto retirado torna a alteração impossível.
    const sofa=getScene(data).furniture[0];
    const moved=updateScenarioFurniture(data,'cenario',{...sofa,x:3.5,z:2.1,width:.5,depth:.5},'rev2',next);
    expect(()=>changeScenarioRoom(moved,'cenario',L,'rev3',next)).toThrow('ultrapassa');
  });
});
