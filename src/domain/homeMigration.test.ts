import { describe, expect, it } from 'vitest';
import type { HomeData, HomeDataV1, Project, Room } from '../types';
import { migrateHome, reconcileSpaces, DEFAULT_RESIDENCE_ID } from './homeMigration';
import { roomShapePreset } from '../plan/geometry';

const room: Room = {
  id: 'sala-antiga', name: 'Sala antiga', width: 4, length: 3,
  height: 2.7, x: 0, z: 0, footprint: roomShapePreset('L',4,3),
  openings: [{id:'porta-sala',type:'door',edge:0,offset:.2,width:.8,height:2,sill:0}],
};
const legacy: HomeDataV1 = {
  version: 1, rooms: [room],
  purchases: [{
    id:'compra-1',name:'Tinta',category:'Pintura',roomId:room.id,
    priority:'alta',quantity:3,unitPrice:59.9,purchased:false,
    notes:'Branco',url:'',createdAt:'2026-01-01T00:00:00.000Z',
  }],
  wallStages: {'sala-antiga:leste': {Pintura:'concluido'}},
  logs: [{id:'log-1',roomId:room.id,direction:'leste',stage:'Pintura',
    status:'concluido',note:'Parede concluída',createdAt:'2026-01-01T00:00:00.000Z'}],
};

const project:Project = {
  id:'projeto-1',residenceId:DEFAULT_RESIDENCE_ID,name:'Reformar sala',
  description:'Planejar pintura',type:'reforma',status:'ideia',priority:'media',
  spaceIds:['space-room:sala-antiga'],budgetTargetCents:120000,
  createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z',
};

describe('F6.0 — migração e isolamento dos dados de projetos', () => {
  it('importa V1, mantém geometrias, aberturas, compras e histórico intactos',()=>{
    const input=structuredClone(legacy);
    const next=migrateHome(input);
    expect(next.version).toBe(2);
    expect(input).toEqual(legacy);
    expect(next.rooms).toEqual(legacy.rooms);
    expect(next.purchases).toEqual(legacy.purchases);
    expect(next.wallStages).toEqual(legacy.wallStages);
    expect(next.logs).toEqual(legacy.logs);
    expect(next.residences).toEqual([{id:DEFAULT_RESIDENCE_ID,name:'Minha casa',type:'atual'}]);
    expect(next.spaces).toEqual([{
      id:'space-room:sala-antiga',residenceId:DEFAULT_RESIDENCE_ID,
      type:'interno',state:'existente',name:'Sala antiga',roomId:'sala-antiga',
    }]);
    expect(next.projects).toEqual([]);
  });
  it('é estável em reimportações V2 e guarda projetos independentes da geometria',()=>{
    const first=migrateHome(legacy);
    const second:HomeData={...first,projects:[project]};
    const third=migrateHome(JSON.parse(JSON.stringify(second)));
    expect(third).toEqual(second);
    expect(third.rooms[0]).toEqual(room);
    expect(third.projects[0].budgetTargetCents).toBe(120000);
  });
  it('vincula novo cômodo ao espaço canônico sem duplicar referência',()=>{
    const home=migrateHome(legacy);
    const newRoom={...room,id:'cozinha',name:'Cozinha',x:4,footprint:undefined,openings:[]};
    const updated=reconcileSpaces({...home,rooms:[...home.rooms,newRoom]});
    expect(updated.spaces).toHaveLength(2);
    expect(updated.spaces[1].roomId).toBe('cozinha');
    expect(reconcileSpaces(updated)).toEqual(updated);
  });
  it('mantém ambientes externos sem forçá-los a ter Room',()=>{
    const home=migrateHome(legacy);
    const outside={id:'deck',residenceId:DEFAULT_RESIDENCE_ID,type:'externo' as const,
      state:'planejado' as const,name:'Deck'};
    const updated=migrateHome({...home,spaces:[...home.spaces,outside]});
    expect(updated.spaces.at(-1)).toEqual(outside);
  });
  it('rejeita versões desconhecidas e dados legados inválidos em vez de limpar a casa',()=>{
    expect(()=>migrateHome({...legacy,version:99})).toThrow('Versão');
    expect(()=>migrateHome({...legacy,rooms:[{...room,width:-2}]})).toThrow();
    expect(()=>migrateHome({...legacy,rooms:[room,{...room}]})).toThrow('duplicados');
  });
  it('rejeita projetos de outra residência ou sem ambientes válidos',()=>{
    const home=migrateHome(legacy);
    expect(()=>migrateHome({...home,projects:[{...project,residenceId:'outro'}]})).toThrow();
    expect(()=>migrateHome({...home,projects:[{...project,spaceIds:['inexistente']}]})).toThrow();
    expect(()=>migrateHome({...home,projects:[{...project,budgetTargetCents:1.1}]})).toThrow();
    expect(()=>migrateHome({...home,projects:[project,{...project}]})).toThrow('duplicados');
  });
  it('não descarta ambientes de projetos quando há referências corrompidas',()=>{
    const home=migrateHome(legacy);
    expect(()=>migrateHome({...home,spaces:[{
      id:'fantasma',residenceId:DEFAULT_RESIDENCE_ID,type:'interno',state:'existente',
      name:'Desconhecido',roomId:'nao-existe',
    }]})).toThrow();
  });
  it('permite vários projetos sobre um espaço, mantendo identidades independentes',()=>{
    const home=migrateHome(legacy);
    const next=migrateHome({...home,projects:[
      project,{...project,id:'projeto-2',name:'Trocar o piso',spaceIds:project.spaceIds},
    ]});
    expect(next.projects).toHaveLength(2);
    expect(next.spaces).toHaveLength(1);
  });
});
