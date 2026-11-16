import {describe,it,expect} from 'vitest';
import {initialHome,validateHome} from '../../data';
import {createProject,newProjectDraft,deleteProject} from './projectDomain';
import {newProjectTask,blankTask} from './taskDomain';
import {projectBudget} from './budgetDomain';
import {agendaTasks,localDateToday,phaseBudget,projectActivities,NO_PHASE} from './trackingDomain';
import {addProjectFile,removeProjectFile,makeFileMetadata,validateNewUpload} from './fileDomain';
import {projectFilePath} from '../../domain/fileValidation';
import type {ProjectTask} from '../../types';

const now='2026-11-16T12:00:00Z';
const owner='7b93241f-7e41-466c-ab1a-a0d1912126a8';
const fileId='0e6f7110-a6a3-447e-a800-8fb68b7ff870';
function seed(){
  return createProject(structuredClone(initialHome),
    {...newProjectDraft('residence-primary'),name:'Reformar sala'},'pr1',now);
}
describe('F6.7 — acompanhamento',()=>{
  it('agrega material e serviço por etapa sem duplicação e com valores em centavos',()=>{
    let home=newProjectTask(seed(),{...blankTask('pr1'),title:'Pintura',phase:'Acabamento'},
      't1','e1',now);
    home=validateHome({...home,workTasks:home.workTasks.map(t=>({...t,estimatedCostCents:20000,actualCostCents:15000}))});
    const purchase=(id:string,phase:string,taskId?:string)=>({
      id,name:'Material',category:'Reforma',roomId:'',priority:'media' as const,
      quantity:2,unitPrice:50,purchased:true,status:'comprado' as const,
      notes:'',url:'',createdAt:now,projectId:'pr1',taskId,
      phase,actualUnitPriceCents:4000,
    });
    home=validateHome({...home,purchases:[purchase('p1','', 't1'),purchase('p2','Preparação')]});
    const groups=phaseBudget(home,'pr1'),finished=groups.find(g=>g.phase==='Acabamento')!;
    expect(finished.materialsCents).toBe(10000);
    expect(finished.servicesCents).toBe(20000);
    expect(finished.actualCents).toBe(23000);
    expect(groups.find(g=>g.phase==='Preparação')?.materialsCents).toBe(10000);
    const all=projectBudget(home,'pr1');
    expect(groups.reduce((sum,g)=>sum+g.forecastCents,0)).toBe(all.baseCents);
    expect(groups.reduce((sum,g)=>sum+g.actualCents,0)).toBe(all.registeredCents);
  });
  it('filtra agenda local e não inclui trabalhos concluídos',()=>{
    const task=(id:string,date:string|null):ProjectTask=>({
      ...blankTask('pr1'),id,title:id,dueDate:date,
      history:[],createdAt:now,updatedAt:now,
    });
    const list=[task('atrasada','2026-11-15'),task('hoje','2026-11-16'),
      task('sem','2026-11-22'),task('mes','2026-12-01'),task('sem-prazo',null)];
    expect(agendaTasks(list,'atrasadas','2026-11-16').map(t=>t.id)).toEqual(['atrasada']);
    expect(agendaTasks(list,'semana','2026-11-16').map(t=>t.id)).toEqual(['hoje','sem']);
    expect(agendaTasks(list,'mes','2026-11-16').map(t=>t.id)).toEqual(['hoje','sem','mes']);
    expect(agendaTasks(list,'sem-prazo','2026-11-16')).toHaveLength(1);
    expect(localDateToday(new Date('2026-11-16T04:00:00Z'))).toBe('2026-11-16');
  });
  it('mantém histórico rastreável e ordem determinística',()=>{
    const home=newProjectTask(seed(),{...blankTask('pr1'),title:'Serviço'},'t1','e1',now);
    expect(projectActivities(home,'pr1').map(x=>x.title)).toEqual(['Projeto criado','Serviço']);
  });
  it('valida metadados de arquivo, isolamento no backup e exclusão protegida',()=>{
    const home=seed(),f={name:'planta.pdf',type:'application/pdf',size:12345};
    const file=makeFileMetadata({ownerId:owner,projectId:'pr1',id:fileId,file:f,at:now});
    const withFile=addProjectFile(home,file);
    expect(withFile.projectFiles).toEqual([file]);
    expect(validateHome(JSON.parse(JSON.stringify(withFile)))).toEqual(withFile);
    expect(()=>deleteProject(withFile,'pr1')).toThrow('arquivos');
    expect(removeProjectFile(withFile,fileId).projectFiles).toEqual([]);
    expect(()=>validateHome({...withFile,projectFiles:[file,file]})).toThrow('duplicado');
    expect(()=>validateHome({...withFile,projectFiles:[{...file,path:'otro/abc'}]})).toThrow();
    expect(()=>validateHome({...withFile,projectFiles:[{...file,taskId:'externo'}]})).toThrow();
    const old=structuredClone(home);delete old.projectFiles;
    expect(validateHome(old).projectFiles).toBeUndefined();
  });
  it('bloqueia conteúdo executável, tamanho e caminhos inseguros',()=>{
    expect(()=>validateNewUpload({name:'script.js',type:'application/javascript',size:20})).toThrow();
    expect(()=>validateNewUpload({name:'grande.pdf',type:'application/pdf',size:9*1024*1024})).toThrow();
    expect(()=>projectFilePath(owner,'../hack',fileId,'application/pdf')).toThrow();
    expect(phaseBudget(seed(),'pr1')).toEqual([]);
    expect(NO_PHASE).toBe('Sem etapa');
  });
});
