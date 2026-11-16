import { describe,expect,it } from 'vitest';
import type { HomeData,Room,ProjectScenario } from '../../types';
import { initialHome,validateHome } from '../../data';
import { makeSpaceForRoom } from '../../domain/homeMigration';
import { scenarioSummary } from '../../domain/scenarioValidation';
import { createProject,deleteProject,newProjectDraft } from './projectDomain';
import {
  changeScenarioRoom,createScenario,createScenarioRoom,deleteScenario,duplicateScenario,
  removeScenarioRoom,renameScenario,resetScenarioToActual,resizeScenarioRoom,
  restoreScenarioRevision,
} from './scenarioDomain';
import { roomShapePreset } from '../../plan/geometry';

const now='2026-11-16T12:00:00.000Z',later='2026-11-17T12:00:00.000Z';
const room:Room={
  id:'sala',name:'Sala real',width:4,length:3,height:2.7,x:0,z:0,
  footprint:roomShapePreset('L',4,3),openings:[{
    id:'porta',type:'door',edge:0,offset:0.4,width:0.9,height:2.1,sill:0,
  }],
};
function home():HomeData {
  const base:HomeData={...structuredClone(initialHome),rooms:[room],spaces:[makeSpaceForRoom(room)]};
  return createProject(base,{...newProjectDraft('residence-primary'),
    name:'Reformar sala',spaceIds:['space-room:sala']},'project',now);
}
const seed=()=>createScenario(home(),'project','Sala renovada','scenario',now,'projeto');

describe('F6.4 — cenários de projeto independentes',()=>{
  it('clona geometria e aberturas sem modificar os cômodos reais',()=>{
    const before=home(),after=createScenario(before,'project','Versão A','s1',now,'projeto');
    expect(after.scenarios[0].rooms).toEqual(before.rooms);
    expect(after.scenarios[0].rooms).not.toBe(before.rooms);
    expect(after.scenarios[0].rooms[0]).not.toBe(before.rooms[0]);
    const changed=changeScenarioRoom(after,'s1',{...after.scenarios[0].rooms[0],name:'Sala planejada'},
      'rev-1',later);
    expect(changed.scenarios[0].rooms[0].name).toBe('Sala planejada');
    expect(changed.scenarios[0].revisions[0].rooms[0]).toEqual(room);
    expect(changed.rooms).toEqual(before.rooms);
    expect(changed.spaces).toEqual(before.spaces);
    expect(changed.wallStages).toEqual(before.wallStages);
    expect(changed.projects[0].id).toBe('project');
  });
  it('permite cenário vazio e cômodo novo, sem criar cômodo na casa real',()=>{
    const blank=createScenario(home(),'project','Deck planejado','deck',now,'vazio');
    expect(blank.scenarios[0].rooms).toEqual([]);
    const planned={id:'novo-espaco',name:'Nova varanda',width:5,length:4,height:2.7,x:4,z:0};
    const next=createScenarioRoom(blank,'deck',planned,'rev-add',later);
    expect(next.scenarios[0].rooms).toEqual([planned]);
    expect(next.rooms).toEqual([room]);
    expect(next.spaces).toHaveLength(1);
    expect(scenarioSummary(next.scenarios[0],[room])).toEqual({changed:0,added:1,removed:1,untouched:0});
    expect(()=>createScenarioRoom(next,'deck',room,'duplicate',later)).toThrow('ID existente');
  });
  it('redimensiona polígono com portas válidas e restaura versões anteriores',()=>{
    const start=seed();
    const changed=resizeScenarioRoom(start,'scenario','sala',
      {name:'Sala ampliada',width:6,length:4,height:2.7,x:1,z:2},'version1',later);
    expect(changed.scenarios[0].rooms[0].width).toBe(6);
    expect(changed.scenarios[0].rooms[0].footprint).toHaveLength(6);
    expect(changed.scenarios[0].rooms[0].openings?.[0].width).toBeCloseTo(1.35);
    expect(changed.rooms[0]).toEqual(room);
    const restored=restoreScenarioRevision(changed,'scenario','version1','version2','2026-11-17T14:00:00Z');
    expect(restored.scenarios[0].rooms).toEqual([room]);
    expect(restored.scenarios[0].revisions.at(-1)?.rooms[0].width).toBe(6);
    expect(restored.rooms).toEqual([room]);
  });
  it('duplicação de cenários não compartilha estado nem histórico',()=>{
    const start=seed();
    const cloned=duplicateScenario(start,'scenario','alternative','Opção B',later);
    const changed=changeScenarioRoom(cloned,'alternative',{...room,name:'Sala alternativa'},
      'version1',later);
    expect(changed.scenarios.find(s=>s.id==='scenario')?.rooms[0].name).toBe('Sala real');
    expect(changed.scenarios.find(s=>s.id==='alternative')?.rooms[0].name).toBe('Sala alternativa');
    expect(changed.scenarios.find(s=>s.id==='scenario')?.revisions).toEqual([]);
    expect(changed.scenarios.find(s=>s.id==='alternative')?.revisions).toHaveLength(1);
  });
  it('exclui cômodos somente do cenário, protegendo a casa e compras',()=>{
    const start=seed();
    const after=removeScenarioRoom(start,'scenario','sala','ver-remover',later);
    expect(after.scenarios[0].rooms).toEqual([]);
    expect(after.scenarios[0].revisions[0].rooms).toEqual([room]);
    expect(after.rooms).toEqual([room]);
    expect(after.spaces).toHaveLength(1);
  });
  it('rebase do cenário usa planta atual e mantém o desenho antigo no histórico',()=>{
    const start=seed();
    const altered=changeScenarioRoom(start,'scenario',{...room,name:'Sala futura'},'v1',later);
    const repl=resetScenarioToActual(altered,'scenario','v2','2026-11-18T12:00:00Z');
    expect(repl.scenarios[0].rooms).toEqual([room]);
    expect(repl.scenarios[0].revisions.at(-1)?.rooms[0].name).toBe('Sala futura');
  });
  it('arquivo V1/V2 antigo sem scenarios recupera [] e não altera outros dados',()=>{
    const old=home();
    const v2={...old} as Partial<HomeData>;
    delete v2.scenarios;
    const validated=validateHome(JSON.parse(JSON.stringify(v2)));
    expect(validated.scenarios).toEqual([]);
    expect(validated.rooms).toEqual([room]);
    const migrated=validateHome(JSON.parse(JSON.stringify(seed())));
    expect(migrated).toEqual(seed());
  });
  it('recusa geometria inválida, cenários órfãos e IDs duplicados na importação',()=>{
    const start=seed();
    expect(()=>validateHome({...start,scenarios:[{...start.scenarios[0],projectId:'other'}]})).toThrow();
    expect(()=>validateHome({...start,scenarios:[start.scenarios[0],start.scenarios[0]]})).toThrow();
    expect(()=>validateHome({...start,scenarios:[{...start.scenarios[0],rooms:[{...room,width:-4}]}]})).toThrow();
    expect(()=>validateHome({...start,scenarios:[{...start.scenarios[0],revisions:'invalid'}]})).toThrow();
    expect(()=>createScenario(start,'project','Outro','scenario',later,'projeto')).toThrow('duplicado');
  });
  it('proíbe alterações de cenários em projetos arquivados',()=>{
    const start=seed();
    const archived=validateHome({...start,projects:start.projects.map(p=>({...p,archivedAt:later}))});
    expect(()=>changeScenarioRoom(archived,'scenario',{...room,name:'Mudança'},'v1',later)).toThrow('Reative');
    expect(()=>deleteScenario(archived,'scenario')).toThrow('Reative');
    expect(()=>duplicateScenario(archived,'scenario','new','Cópia',later)).toThrow('Reative');
  });
  it('bloqueia apagar projeto com cenários e permite excluir apenas o cenário',()=>{
    const start=seed();
    expect(()=>deleteProject(start,'project')).toThrow('cenários');
    const without=deleteScenario(start,'scenario');
    expect(without.scenarios).toHaveLength(0);
    expect(deleteProject(without,'project').projects).toHaveLength(0);
    expect(without.rooms).toEqual([room]);
  });
  it('limita versões a 12 sem destruir a planta ativa',()=>{
    let state=seed();
    for(let i=0;i<14;i++){
      const next={...state.scenarios[0].rooms[0],name:'Sala versão '+i};
      state=changeScenarioRoom(state,'scenario',next,'rev-'+i,later);
    }
    expect(state.scenarios[0].revisions).toHaveLength(12);
    expect(state.scenarios[0].revisions[0].id).toBe('rev-2');
    expect(state.scenarios[0].rooms[0].name).toBe('Sala versão 13');
    expect(state.rooms).toEqual([room]);
  });
  it('edita nome e descrição do cenário sem mutar a casa',()=>{
    const start=seed();
    const edited=renameScenario(start,'scenario','  Alternativa azul  ','  Trocar a sala  ',later);
    expect(edited.scenarios[0]).toMatchObject({name:'Alternativa azul',description:'Trocar a sala'});
    expect(edited.rooms).toEqual([room]);
  });
});
