import type {HomeData,ProjectFile} from '../types';

export const FILE_MIME_EXTENSIONS:Record<string,string>={
  'image/jpeg':'jpg','image/png':'png','image/webp':'webp',
  'application/pdf':'pdf','text/plain':'txt',
};
export const MAX_PROJECT_FILE_BYTES=8*1024*1024;
export const MAX_FILES_PER_PROJECT=30;
export const FILE_BUCKET='myhouse-project-files';
const id=(s:unknown):s is string=>typeof s==='string'&&s.trim().length>0&&s.length<=160;
const uuid=(s:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
export function projectFilePath(ownerId:string,projectId:string,fileId:string,contentType:string):string {
  if(!uuid(ownerId)||!id(projectId)||!uuid(fileId)
    ||projectId.includes('/')||projectId==='.'||projectId==='..'
    ||!Object.prototype.hasOwnProperty.call(FILE_MIME_EXTENSIONS,contentType)){
    throw new Error('Dados de armazenamento do arquivo inválidos.');
  }
  return ownerId+'/'+projectId+'/'+fileId+'.'+FILE_MIME_EXTENSIONS[contentType];
}
export function validateProjectFileMeta(file:unknown):asserts file is ProjectFile {
  if(!file||typeof file!=='object')throw new Error('Anexo inválido.');
  const f=file as ProjectFile;
  if(!id(f.id)||!uuid(f.id)||!id(f.projectId)||!uuid(f.ownerId)
    ||(f.taskId!==undefined&&!id(f.taskId))
    ||typeof f.name!=='string'||!f.name.trim()||f.name.length>160
    ||typeof f.contentType!=='string'||!Object.prototype.hasOwnProperty.call(FILE_MIME_EXTENSIONS,f.contentType)
    ||!Number.isSafeInteger(f.size)||f.size<=0||f.size>MAX_PROJECT_FILE_BYTES
    ||typeof f.uploadedAt!=='string'||!Number.isFinite(Date.parse(f.uploadedAt))
    ||f.path!==projectFilePath(f.ownerId,f.projectId,f.id,f.contentType)){
    throw new Error('Metadados do anexo inválidos.');
  }
}
export function validateProjectFiles(home:Pick<HomeData,'projects'|'workTasks'|'projectFiles'>):void {
  if(home.projectFiles===undefined)return;
  if(!Array.isArray(home.projectFiles)||home.projectFiles.length>1200)throw new Error('Lista de anexos inválida.');
  const ids=new Set<string>(),paths=new Set<string>(),counts=new Map<string,number>();
  for(const raw of home.projectFiles){
    validateProjectFileMeta(raw);
    const file=raw as ProjectFile;
    if(ids.has(file.id)||paths.has(file.path))throw new Error('Anexo duplicado.');
    ids.add(file.id);paths.add(file.path);
    if(!home.projects.some(p=>p.id===file.projectId))throw new Error('Anexo associado a projeto inexistente.');
    if(file.taskId&&!home.workTasks.some(t=>t.id===file.taskId&&t.projectId===file.projectId)){
      throw new Error('Anexo associado a tarefa inexistente ou de outro projeto.');
    }
    counts.set(file.projectId,(counts.get(file.projectId)??0)+1);
    if(counts.get(file.projectId)!>MAX_FILES_PER_PROJECT)throw new Error('Limite de anexos por projeto excedido.');
  }
}
