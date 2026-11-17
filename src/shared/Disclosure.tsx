import type { ReactNode } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';

export default function Disclosure({title,children,summary,filter=false,activeCount=0,onReset}:{
  title:string;children:ReactNode;summary?:string;filter?:boolean;activeCount?:number;onReset?:()=>void;
}){
  return <details className={filter?'compact-disclosure compact-filters':'compact-disclosure'}>
    <summary>{filter&&<SlidersHorizontal size={17} aria-hidden="true"/>}<span>{title}</span>
      {activeCount>0&&<span className="disclosure-count" aria-label={activeCount+' filtros ativos'}>{activeCount}</span>}
      {summary&&<small>{summary}</small>}<ChevronDown size={18} aria-hidden="true"/>
    </summary>
    <div className="disclosure-body">{children}{onReset&&activeCount>0&&<button type="button" className="btn btn-outline reset-filters" onClick={onReset}>Limpar filtros</button>}</div>
  </details>;
}
