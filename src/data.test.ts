import { describe, expect, it } from 'vitest';
import { initialHome, validateHome } from './data';
import { roomShapePreset } from './plan/geometry';
import type { HomeData, Room } from './types';

const oldRoom: Room = { id:'legacy',name:'Quarto antigo',width:3,length:4,height:2.7,x:0,z:0 };
const valid: HomeData = {...initialHome,rooms:[oldRoom],logs:[{ id:'log',roomId:'legacy',direction:'leste',stage:'Pintura',status:'concluido',note:'Parede pronta',createdAt:'2026-01-01T00:00:00Z' }],wallStages:{'legacy:leste':{Pintura:'concluido'}}};

describe('backup V1 e geometrias de planta',()=>{
  it('preserva dados V1 legados sem introduzir geometria implícita no backup',()=>{
    const loaded=validateHome(JSON.parse(JSON.stringify(valid)));
    expect(loaded.rooms[0].footprint).toBeUndefined();
    expect(loaded.logs).toEqual(valid.logs);
    expect(loaded.wallStages).toEqual(valid.wallStages);
  });
  it('aceita backup V1 com polígono e portas/janelas',()=>{
    const room: Room={...oldRoom,footprint:roomShapePreset('L',3,4),openings:[{id:'door',type:'door',edge:0,offset:.5,width:.8,height:2,sill:0}]};
    const loaded=validateHome(JSON.parse(JSON.stringify({...valid,rooms:[room]})));
    expect(loaded.rooms[0].footprint).toHaveLength(6);
    expect(loaded.rooms[0].openings?.[0].id).toBe('door');
  });
  it('rejeita backup de planta inválida em vez de carregar modelo inseguro',()=>{
    expect(()=>validateHome({...valid,rooms:[{...oldRoom,openings:[{id:'bad',type:'window',edge:99,offset:0,width:1,height:1,sill:.8}]}]})).toThrow();
  });
});
