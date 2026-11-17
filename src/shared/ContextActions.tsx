import { useEffect,useId,useRef,useState,type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useBackLayer } from './useBackLayer';

export type ContextAction={label:string;onClick:()=>void;icon?:ReactNode;disabled?:boolean;danger?:boolean};
export default function ContextActions({label,actions}:{label:string;actions:ContextAction[]}){
  const [open,setOpen]=useState(false);
  const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),group=useRef<HTMLDivElement>(null);
  const id=useId();
  function close(restore=false){setOpen(false);if(restore)trigger.current?.focus({preventScroll:true});}
  useBackLayer(open,65,()=>close(true));
  useEffect(()=>{
    if(!open)return;
    const frame=requestAnimationFrame(()=>group.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({preventScroll:true}));
    const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))close();};
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);
    return()=>{cancelAnimationFrame(frame);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);};
  },[open]);
  return <div ref={root} className="context-actions">
    <button type="button" ref={trigger} className="btn btn-outline context-trigger" aria-label={label} aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>setOpen(v=>!v)}><MoreHorizontal size={21} aria-hidden="true"/><span>Ações</span></button>
    {open&&<div className="context-menu" id={id} ref={group} role="group" aria-label={label}>
      {actions.map(action=><button key={action.label} type="button" className={action.danger?'context-danger':undefined} disabled={action.disabled} onClick={()=>{close(true);action.onClick();}}>{action.icon}<span>{action.label}</span></button>)}
    </div>}
  </div>;
}
