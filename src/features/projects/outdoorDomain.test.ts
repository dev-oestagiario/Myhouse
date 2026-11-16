import { describe,expect,it } from 'vitest';
import { initialHome,validateHome } from '../../data';
import { createProject,newProjectDraft } from './projectDomain';
import { createScenario,duplicateScenario,restoreScenarioRevision,
  addScenarioOutdoorArea,updateScenarioOutdoorArea,removeScenarioOutdoorArea } from './scenarioDomain';
import { newOutdoorArea,outlinePreset,outdoorAreaSquareMeters,validateOutdoorAreas } from './outdoorGeometry';

const now='2026-11-16T12:00:00.000Z';
const next='2026-11-17T12:00:00.000Z';
function seed() {
  const home=createProject(structuredClone(initialHome),
    {...newProjectDraft('residence-primary'),name:'Deck no quintal'},'p1',now);
  return createScenario(home,'p1','Alternativa externa','s1',now,'vazio');
}
describe('F6.6 — áreas externas independentes',()=>{
  it('calcula área de polígono concavo em m²',()=>{
    expect(outdoorAreaSquareMeters(outlinePreset('retangular'))).toBe(12);
    expect(outdoorAreaSquareMeters(outlinePreset('L'))).toBeCloseTo(9.76);
    expect(outdoorAreaSquareMeters([...outlinePreset('L')].reverse())).toBeCloseTo(9.76);
  });
  it('cria deck sem criar cômodo interno e preserva outras entidades',()=>{
    const before=seed();
    const after=addScenarioOutdoorArea(before,'s1',newOutdoorArea('a1'),'rev1',next);
    expect(after.scenarios[0].outdoorAreas).toHaveLength(1);
    expect(after.scenarios[0].rooms).toEqual([]);
    expect(after.rooms).toEqual(before.rooms);
    expect(after.spaces).toEqual(before.spaces);
    expect(after.projects).toHaveLength(1);
    expect(after.scenarios[0].revisions[0].outdoorAreas).toEqual([]);
  });
  it('edita contorno, nível, acabamento, guarda-corpo e degraus e restaura a versão anterior',()=>{
    const start=addScenarioOutdoorArea(seed(),'s1',newOutdoorArea('a1'),'rev1',next);
    const updated={...newOutdoorArea('a1'),outline:outlinePreset('L'),level:0.45,
      railingEdges:[0,1],stepsEdge:4,finish:'cinza' as const};
    const after=updateScenarioOutdoorArea(start,'s1',updated,'rev2',next);
    expect(after.scenarios[0].outdoorAreas?.[0]).toEqual(updated);
    const restored=restoreScenarioRevision(after,'s1','rev2','rev3',next);
    expect(restored.scenarios[0].outdoorAreas?.[0]).toEqual(newOutdoorArea('a1'));
    expect(restored.scenarios[0].revisions.at(-1)?.outdoorAreas?.[0]).toEqual(updated);
    expect(restored.rooms).toEqual(start.rooms);
  });
  it('remove apenas área do cenário e permite duplicar sem compartilhar objetos',()=>{
    const start=addScenarioOutdoorArea(seed(),'s1',newOutdoorArea('a1'),'rev1',next);
    const copied=duplicateScenario(start,'s1','s2','Outro deck',next);
    const removed=removeScenarioOutdoorArea(copied,'s2','a1','rev2',next);
    expect(removed.scenarios.find(s=>s.id==='s1')?.outdoorAreas).toHaveLength(1);
    expect(removed.scenarios.find(s=>s.id==='s2')?.outdoorAreas).toEqual([]);
    expect(removed.scenarios.find(s=>s.id==='s2')?.revisions[0].outdoorAreas).toHaveLength(1);
    expect(removed.rooms).toEqual(start.rooms);
  });
  it('valida cruzamentos, vértices repetidos, acessórios fora de faixa e números inválidos',()=>{
    expect(()=>validateOutdoorAreas([{
      ...newOutdoorArea('a'),outline:[{x:0,z:0},{x:3,z:3},{x:0,z:3},{x:3,z:0}],
    }])).toThrow();
    expect(()=>validateOutdoorAreas([{
      ...newOutdoorArea('a'),outline:[{x:0,z:0},{x:4,z:0},{x:4,z:0},{x:0,z:3}],
    }])).toThrow();
    expect(()=>validateOutdoorAreas([{...newOutdoorArea('a'),railingEdges:[9]}])).toThrow();
    expect(()=>validateOutdoorAreas([{...newOutdoorArea('a'),stepsEdge:4}])).toThrow();
    expect(()=>validateOutdoorAreas([{...newOutdoorArea('a'),level:Infinity}])).toThrow();
    expect(()=>validateOutdoorAreas([newOutdoorArea('a'),newOutdoorArea('a')])).toThrow();
  });
  it('aceita backup F6.5 anterior sem campos externos e recusa histórico corrompido',()=>{
    const legacy=seed();
    expect(validateHome(legacy)).toEqual(legacy);
    const withArea=addScenarioOutdoorArea(legacy,'s1',newOutdoorArea('a1'),'r',next);
    expect(validateHome(JSON.parse(JSON.stringify(withArea)))).toEqual(withArea);
    const damaged=structuredClone(withArea);
    damaged.scenarios[0].revisions[0].outdoorAreas=[{...newOutdoorArea('x'),level:NaN}];
    expect(()=>validateHome(damaged)).toThrow();
  });
  it('bloqueia edição de área em projetos arquivados',()=>{
    const start=seed();
    const archived={...start,projects:start.projects.map(p=>({...p,archivedAt:next}))};
    expect(()=>addScenarioOutdoorArea(archived,'s1',newOutdoorArea('a'),'rev1',next)).toThrow('Reative');
  });
});
