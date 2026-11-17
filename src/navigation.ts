export const PAGES = ['overview','projects','shopping','floorplan','plan-editor','works','scan','history'] as const;
export type Page = typeof PAGES[number];
export const PROJECT_SECTIONS = ['tarefas','orcamento','cenarios','acompanhamento','arquivos'] as const;
export type ProjectSection = typeof PROJECT_SECTIONS[number];
export const projectSectionLabels: Record<ProjectSection,string> = {
  tarefas:'Tarefas',orcamento:'Orçamento',cenarios:'Cenários',acompanhamento:'Acompanhamento',arquivos:'Arquivos'
};
export type AppRoute = { page: Page; projectId: string | null; itemId?: string; section?: ProjectSection; detailId?: string; create?: boolean };

function decodeId(value?: string): string | null {
  try{
    const id=decodeURIComponent(value??'');
    return id && id.length<=200 && !/[\u0000-\u001f]/.test(id)?id:null;
  }catch{return null;}
}
export function parseRoute(hash: string): AppRoute {
  const parts=hash.replace(/^#\/?/,'').split('/');
  const page=PAGES.find(item=>item===parts[0])??'overview';
  const base:AppRoute={page,projectId:null};
  if(page==='projects'){
    if(parts[1]==='new'&&parts.length===2)return {...base,create:true};
    const projectId=decodeId(parts[1]);
    if(!projectId||parts.length>4)return base;
    if(parts.length===2)return {...base,projectId};
    const section=PROJECT_SECTIONS.find(item=>item===parts[2]);
    if(!section)return base;
    if(parts.length===3)return {...base,projectId,section};
    const detailId=decodeId(parts[3]);
    if(!detailId||!(section==='tarefas'||section==='cenarios'))return base;
    return {...base,projectId,section,detailId};
  }
  if((page==='shopping'||page==='works')&&parts.length===2){
    const itemId=decodeId(parts[1]);
    if(itemId)return {...base,itemId};
  }
  return base;
}
export function routeHash(route: AppRoute): string {
  const base='#/'+route.page;
  if(route.page==='projects'){
    if(route.create&&!route.projectId)return base+'/new';
    if(route.projectId){
      const project=base+'/'+encodeURIComponent(route.projectId);
      if(route.detailId&&(route.section==='tarefas'||route.section==='cenarios'))return project+'/'+route.section+'/'+encodeURIComponent(route.detailId);
      return route.section&&route.section!=='tarefas'?project+'/'+route.section:project;
    }
  }
  return (route.page==='shopping'||route.page==='works')&&route.itemId?base+'/'+encodeURIComponent(route.itemId):base;
}

/** Physical back follows the internal hierarchy, even when the app was opened by a deep link. */
export function parentRoute(route: AppRoute): AppRoute | null {
  if(route.page==='projects'){
    if(route.create)return {page:'projects',projectId:null};
    if(route.projectId&&route.detailId)return {page:'projects',projectId:route.projectId,section:route.section};
    if(route.projectId&&route.section&&route.section!=='tarefas')return {page:'projects',projectId:route.projectId};
    if(route.projectId)return {page:'projects',projectId:null};
  }
  if((route.page==='shopping'||route.page==='works')&&route.itemId)return {page:route.page,projectId:null};
  if(route.page==='plan-editor')return {page:'floorplan',projectId:null};
  if(route.page==='scan')return {page:'works',projectId:null};
  return route.page==='overview'?null:{page:'overview',projectId:null};
}
