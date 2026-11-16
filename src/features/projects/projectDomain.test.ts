import { describe, expect, it } from 'vitest';
import { initialHome, validateHome } from '../../data';
import { makeSpaceForRoom } from '../../domain/homeMigration';
import type { HomeData, Room } from '../../types';
import {
  createProject, deleteProject, formatBudgetInput, newProjectDraft,
  parseBudgetCents, setProjectArchived, updateProject,
} from './projectDomain';

const now = '2026-11-16T12:00:00.000Z';
const later = '2026-11-17T12:00:00.000Z';
const room: Room = { id: 'sala', name: 'Sala', width: 4, length: 3, height: 2.7, x: 0, z: 0 };
function seed(): HomeData {
  return validateHome({
    ...structuredClone(initialHome),
    rooms: [room],
    spaces: [makeSpaceForRoom(room)],
    purchases: [{
      id:'tinta', name:'Tinta', category:'Pintura', roomId:'sala', priority:'media',
      quantity:2, unitPrice:89.90, purchased:false, notes:'', url:'', createdAt:now,
    }],
    wallStages: {'sala:leste':{Pintura:'concluido'}},
    logs: [{id:'log',roomId:'sala',direction:'leste',stage:'Pintura',status:'concluido',note:'',createdAt:now}],
  });
}
const draft = () => ({
  ...newProjectDraft('residence-primary'),
  name: '  Renovar sala  ', type: 'reforma' as const, spaceIds: ['space-room:sala'],
  budgetTargetCents: 260050,
});

describe('F6.1 — projetos residenciais', () => {
  it('cria projeto com ID, status inicial e orçamento em centavos, sem alterar compras/obras', () => {
    const home=seed(), next=createProject(home,draft(),'projeto-1',now);
    expect(next.projects).toHaveLength(1);
    expect(next.projects[0]).toMatchObject({
      id:'projeto-1', name:'Renovar sala', residenceId:'residence-primary',
      spaceIds:['space-room:sala'],budgetTargetCents:260050,status:'ideia',
      createdAt:now,updatedAt:now,
    });
    expect(next.rooms).toEqual(home.rooms);
    expect(next.purchases).toEqual(home.purchases);
    expect(next.logs).toEqual(home.logs);
    expect(next.wallStages).toEqual(home.wallStages);
    expect(home.projects).toHaveLength(0);
  });
  it('permite projeto externo sem ambiente definido e depois vincular a sala',()=>{
    const home=seed();
    const created=createProject(home,{...draft(),name:'Deck no quintal',spaceIds:[]},'deck',now);
    const updated=updateProject(created,'deck',{...draft(),name:'Deck no quintal',status:'planejando'},later);
    expect(created.projects[0].spaceIds).toEqual([]);
    expect(updated.projects[0].spaceIds).toEqual(['space-room:sala']);
    expect(updated.projects[0].createdAt).toBe(now);
    expect(updated.projects[0].updatedAt).toBe(later);
  });
  it('arquiva e reativa sem mudar o status nem apagar o cadastro',()=>{
    const home=createProject(seed(),draft(),'p1',now);
    const archived=setProjectArchived(home,'p1',true,later);
    expect(archived.projects[0].archivedAt).toBe(later);
    expect(archived.projects[0].status).toBe('ideia');
    expect(()=>updateProject(archived,'p1',draft(),later)).toThrow(/Reative/);
    const active=setProjectArchived(archived,'p1',false,later);
    expect(active.projects[0].archivedAt).toBeUndefined();
    expect(active.projects[0].name).toBe('Renovar sala');
    expect(setProjectArchived(active,'p1',false,later)).toBe(active);
  });
  it('exclui apenas projeto, sem mexer na casa e nas compras',()=>{
    const home=createProject(seed(),draft(),'p1',now);
    const next=deleteProject(home,'p1');
    expect(next.projects).toEqual([]);
    expect(next.rooms).toEqual(home.rooms);
    expect(next.purchases).toEqual(home.purchases);
    expect(next.logs).toEqual(home.logs);
    expect(()=>deleteProject(next,'p1')).toThrow('não encontrado');
  });
  it('bloqueia referências inválidas e projetos duplicados',()=>{
    const home=seed();
    expect(()=>createProject(home,{...draft(),spaceIds:['desconhecido']},'p1',now)).toThrow();
    expect(()=>createProject(home,{...draft(),spaceIds:['space-room:sala','space-room:sala']},'p1',now)).toThrow();
    expect(()=>createProject(home,{...draft(),name:'a'},'p1',now)).toThrow();
    const created=createProject(home,draft(),'p1',now);
    expect(()=>createProject(created,draft(),'p1',now)).toThrow();
  });
  it('armazena valores monetários exatos e recusa formatos ambíguos',()=>{
    expect(parseBudgetCents('1.234,56')).toThrow();
    expect(parseBudgetCents('1234,56')).toBe(123456);
    expect(parseBudgetCents('0,01')).toBe(1);
    expect(parseBudgetCents('12.3')).toBe(1230);
    expect(parseBudgetCents('')).toBeNull();
    expect(formatBudgetInput(123456)).toBe('1234,56');
    expect(()=>parseBudgetCents('-2')).toThrow();
    expect(()=>parseBudgetCents('1,999')).toThrow();
    expect(()=>parseBudgetCents('infinito')).toThrow();
  });
  it('preserva projeto após exportar e importar backup JSON V2',()=>{
    const home=createProject(seed(),draft(),'p1',now);
    const archived=setProjectArchived(home,'p1',true,later);
    expect(validateHome(JSON.parse(JSON.stringify(archived)))).toEqual(archived);
  });
});
