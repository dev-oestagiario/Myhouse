import {useState,type ChangeEvent} from 'react';
import {Download,FileText,Trash2,Upload} from 'lucide-react';
import type {HomeData,Project,ProjectFile} from '../../types';
import {supabase} from '../../supabase';
import {newId} from '../../data';
import {FILE_BUCKET,MAX_FILES_PER_PROJECT} from '../../domain/fileValidation';
import {makeFileMetadata,addProjectFile,removeProjectFile} from './fileDomain';
import './tracking.css';

type Props={home:HomeData;project:Project;userId:string;onChange:(next:HomeData)=>void};
const sizeLabel=(n:number)=>(n/1024).toLocaleString('pt-BR',{maximumFractionDigits:1})+' KB';
const dateLabel=(s:string)=>new Date(s).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
function errorMessage(e:unknown):string {
  const message=e instanceof Error?e.message:'Não foi possível acessar o armazenamento privado.';
  if(/bucket not found|not found|policy|permission|row-level security/i.test(message)) {
    return 'Armazenamento privado indisponível ou acesso negado. A configuração segura de Storage ainda precisa ser validada antes da publicação.';
  }
  return message;
}
export default function ProjectFiles({home,project,userId,onChange}:Props){
  const files=(home.projectFiles??[]).filter(f=>f.projectId===project.id)
    .sort((a,b)=>b.uploadedAt.localeCompare(a.uploadedAt));
  const tasks=home.workTasks.filter(t=>t.projectId===project.id);
  const [taskId,setTaskId]=useState('');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  async function upload(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];e.target.value='';
    if(!file||busy)return;
    setBusy(true);setError('');setNotice('');
    let uploadedPath:string|null=null;
    try{
      if(!supabase)throw new Error('Conexão de armazenamento não configurada.');
      const metadata=makeFileMetadata({ownerId:userId,projectId:project.id,taskId:taskId||undefined,
        id:newId(),file,at:new Date().toISOString()});
      const updated=addProjectFile(home,metadata);
      const {error:storageError}=await supabase.storage.from(FILE_BUCKET).upload(metadata.path,file,{
        contentType:metadata.contentType,upsert:false,cacheControl:'0',
      });
      if(storageError)throw storageError;
      uploadedPath=metadata.path;
      onChange(updated);
      setNotice('Arquivo enviado ao armazenamento privado; os metadados aguardam sincronização.');
    }catch(problem){
      setError(errorMessage(problem));
      if(uploadedPath&&supabase)await supabase.storage.from(FILE_BUCKET).remove([uploadedPath]);
    }finally{setBusy(false);}
  }
  async function download(file:ProjectFile){
    setBusy(true);setError('');setNotice('');
    try{
      if(!supabase||file.ownerId!==userId)throw new Error('Arquivo pertence a outra conta e não pode ser aberto.');
      const {data,error:storageError}=await supabase.storage.from(FILE_BUCKET).download(file.path);
      if(storageError||!data)throw storageError??new Error('Arquivo indisponível.');
      const url=URL.createObjectURL(data);
      const link=document.createElement('a');link.href=url;link.download=file.name;
      document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),30_000);
    }catch(problem){setError(errorMessage(problem));}
    finally{setBusy(false);}
  }
  async function remove(file:ProjectFile){
    if(!window.confirm('Excluir definitivamente o arquivo privado '+file.name+'? Esta ação não pode ser desfeita.'))return;
    setBusy(true);setError('');setNotice('');
    try{
      if(!supabase||file.ownerId!==userId)throw new Error('Este arquivo pertence a outra conta.');
      const updated=removeProjectFile(home,file.id);
      const {error:storageError}=await supabase.storage.from(FILE_BUCKET).remove([file.path]);
      if(storageError)throw storageError;
      onChange(updated);
      setNotice('Arquivo removido do armazenamento privado. Metadados aguardam sincronização.');
    }catch(problem){setError(errorMessage(problem));}
    finally{setBusy(false);}
  }
  return <section className="project-files panel" aria-label="Arquivos privados do projeto">
    <header className="tracking-heading"><div><span className="eyebrow dark-eyebrow">DOCUMENTOS DO PROJETO</span>
      <h3>Arquivos privados</h3><p>Plantas, fotos e documentos do projeto ficam em armazenamento privado, com acesso pela conta autenticada.</p></div></header>
    <p className="tracking-hint">O backup JSON guarda apenas referências, não os arquivos. Para transferir uma casa, exporte os documentos separadamente. Até 30 anexos de 8 MB: PDF, JPG, PNG, WebP e TXT.</p>
    {notice&&<p role="status" className="tracking-notice">{notice}</p>}
    {error&&<p role="alert" className="tracking-error">{error}</p>}
    {!project.archivedAt&&<div className="project-files-upload">
      {tasks.length>0&&<label htmlFor="files-task">Vincular à tarefa (opcional)
        <select id="files-task" value={taskId} onChange={e=>setTaskId(e.target.value)} disabled={busy}>
          <option value="">Arquivo geral do projeto</option>
          {tasks.map(task=><option key={task.id} value={task.id}>{task.title}</option>)}
        </select></label>}
      <label className="btn btn-primary project-files-picker">
        <Upload size={16}/> {busy?'Processando…':'Adicionar arquivo'}
        <input aria-label="Escolher arquivo do projeto" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
          onChange={e=>void upload(e)} disabled={busy||files.length>=MAX_FILES_PER_PROJECT}/>
      </label>
    </div>}
    {!files.length?<div className="tracking-empty project-files-empty"><FileText size={26}/>
      <strong>Nenhum arquivo anexado</strong>
      <span>Adicione comprovantes, fotos ou documentos; a ativação depende do bucket privado configurado.</span>
    </div>:<ul className="project-files-list">{files.map(file=><li key={file.id}>
      <FileText size={20}/>
      <div><strong>{file.name}</strong>
        <small>{sizeLabel(file.size)} · {dateLabel(file.uploadedAt)} ·
          {file.taskId?' '+(tasks.find(t=>t.id===file.taskId)?.title??'Tarefa indisponível'):' Projeto'}</small>
        {file.ownerId!==userId&&<small>Referência importada de outra conta (sem acesso ao arquivo)</small>}
      </div>
      <button type="button" className="btn btn-outline" disabled={busy||file.ownerId!==userId}
        onClick={()=>void download(file)}><Download size={16}/>Baixar</button>
      <button type="button" className="icon-button danger-hover" disabled={busy||Boolean(project.archivedAt)||file.ownerId!==userId}
        title="Excluir anexo" aria-label={'Excluir arquivo '+file.name}
        onClick={()=>void remove(file)}><Trash2 size={17}/></button>
    </li>)}</ul>}
  </section>;
}
