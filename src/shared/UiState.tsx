import type {ReactNode} from 'react';
import {AlertCircle,AlertTriangle,CheckCircle2,Info,LoaderCircle,X,type LucideIcon} from 'lucide-react';

export type FeedbackTone='success'|'error'|'warning'|'info';
export function Feedback({tone='info',children,onDismiss,actions,className=''}:{
  tone?:FeedbackTone;children:ReactNode;onDismiss?:()=>void;actions?:ReactNode;className?:string;
}){
  const Icon=tone==='error'?AlertCircle:tone==='warning'?AlertTriangle:tone==='success'?CheckCircle2:Info;
  return <div className={'ui-feedback ui-feedback--'+tone+(className?' '+className:'')} role={tone==='error'?'alert':'status'}>
    <Icon size={19} aria-hidden="true"/>
    <div className="ui-feedback-content"><div>{children}</div>{actions&&<div className="ui-feedback-actions">{actions}</div>}</div>
    {onDismiss&&<button type="button" className="ui-feedback-close" aria-label="Fechar aviso" onClick={onDismiss}><X size={17} aria-hidden="true"/></button>}
  </div>;
}
export function LoadingState({title,description,action,compact=false}:{title:string;description?:string;action?:ReactNode;compact?:boolean}){
  return <div className={'ui-loading'+(compact?' ui-loading--compact':'')}>
    <div className="ui-loading-copy" role="status"><LoaderCircle size={compact?19:28} className="ui-spinner" aria-hidden="true"/>
      <div><strong>{title}</strong>{description&&<p>{description}</p>}</div>
    </div>{action&&<div className="ui-state-actions">{action}</div>}
  </div>;
}
export function EmptyState({icon:Icon,title,description,action,compact=false,className=''}:{
  icon?:LucideIcon;title:string;description?:string;action?:ReactNode;compact?:boolean;className?:string;
}){
  return <div className={'ui-empty'+(compact?' ui-empty--compact':'')+(className?' '+className:'')}>
    {Icon&&<div className="ui-empty-icon"><Icon size={26} aria-hidden="true"/></div>}
    <strong>{title}</strong>{description&&<p>{description}</p>}
    {action&&<div className="ui-state-actions">{action}</div>}
  </div>;
}
