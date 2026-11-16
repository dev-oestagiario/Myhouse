import type {HomeData,ProjectFile} from '../../types';
import {validateHome} from '../../data';
import {MAX_PROJECT_FILE_BYTES,FILE_MIME_EXTENSIONS,MAX_FILES_PER_PROJECT,projectFilePath} from '../../domain/fileValidation';

export function validateNewUpload(file:Pick<File,'name'|'type'|'size'>):void {
  if(!file.name.trim()||file.name.length>160)throw new Error('Nome do arquivo inválido (máximo 160 caracteres).');
  if(!Object.prototype.hasOwnProperty.call(FILE_MIME_EXTENSIONS,file.type)){
    throw new Error('Formato não permitido. Use PDF, PNG, JPG, WebP ou TXT.');
  }
  if(!Number.isSafeInteger(file.size)||file.size<=0||file.size>MAX_PROJECT_FILE_BYTES){
    throw new Error('O arquivo deve ter entre 1 byte e 8 MB.');
  }
}
export function makeFileMetadata(params:{
  ownerId:string;projectId:string;taskId?:string;id:string;
  file:Pick<File,'name'|'type'|'size'>;at:string;
}):ProjectFile {
  validateNewUpload(params.file);
  return {id:params.id,projectId:params.projectId,taskId:params.taskId,
    ownerId:params.ownerId,name:params.file.name,path:projectFilePath(params.ownerId,params.projectId,params.id,params.file.type),
    contentType:params.file.type,size:params.file.size,uploadedAt:params.at};
}
export function addProjectFile(home:HomeData,file:ProjectFile):HomeData {
  const project=home.projects.find(p=>p.id===file.projectId);
  if(!project)throw new Error('Projeto não encontrado.');
  if(project.archivedAt)throw new Error('Reative o projeto para anexar arquivos.');
  if((home.projectFiles??[]).filter(x=>x.projectId===file.projectId).length>=MAX_FILES_PER_PROJECT){
    throw new Error('Limite de 30 anexos por projeto.');
  }
  return validateHome({...home,projectFiles:[...(home.projectFiles??[]),file]});
}
export function removeProjectFile(home:HomeData,fileId:string):HomeData {
  const file=(home.projectFiles??[]).find(f=>f.id===fileId);
  if(!file)throw new Error('Anexo não encontrado.');
  if(home.projects.find(p=>p.id===file.projectId)?.archivedAt)throw new Error('Reative o projeto para excluir anexos.');
  return validateHome({...home,projectFiles:(home.projectFiles??[]).filter(f=>f.id!==fileId)});
}
