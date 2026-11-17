import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { useBackLayer } from './useBackLayer';

export type FloatingAction = { label: string; onClick: () => void; disabled?: boolean; icon?: ReactNode };

export default function FloatingActions({actions}: {actions: FloatingAction[]}) {
  const [open,setOpen]=useState(false);
  const id=useId();
  const root=useRef<HTMLDivElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  const menu=useRef<HTMLDivElement>(null);
  useBackLayer(open,60,()=>{setOpen(false);trigger.current?.focus({preventScroll:true});});
  useEffect(()=>{
    if(!open)return;
    const frame=window.requestAnimationFrame(()=>menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus());
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        trigger.current?.focus({preventScroll:true});
      }
    };
    const outside=(event:PointerEvent)=>{
      if(!root.current?.contains(event.target as Node))setOpen(false);
    };
    document.addEventListener('keydown',key);
    document.addEventListener('pointerdown',outside);
    return ()=>{
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown',key);
      document.removeEventListener('pointerdown',outside);
    };
  },[open]);
  if(!actions.length)return null;
  return <div ref={root} className="floating-actions">
    {open&&<div ref={menu} className="floating-actions-menu" id={id} role="group" aria-label="Opções de cadastro">
      <span className="floating-actions-label">AÇÕES</span>
      {actions.map(action=><button key={action.label} type="button" disabled={action.disabled} onClick={()=>{
        setOpen(false);
        trigger.current?.focus({preventScroll:true});
        action.onClick();
      }}>{action.icon??<Plus size={18} aria-hidden="true"/>}<span>{action.label}</span></button>)}
    </div>}
    <button ref={trigger} type="button" className="floating-actions-trigger" aria-label="Ações de cadastro"
      aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>setOpen(value=>!value)}>
      {open?<X size={23} aria-hidden="true"/>:<Plus size={25} aria-hidden="true"/>}<span>{open?'Fechar':'Novo'}</span>
    </button>
  </div>;
}
