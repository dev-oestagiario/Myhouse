import {useState,useRef,type InputHTMLAttributes,type ChangeEvent} from 'react';

// Keep the editable string independent from the domain number (0 while empty).
// Preserve native number constraints, inputmode and accessible spinbutton role.
export function normalizeNumericDraft(value:string):string{
  return value.replace(/^(-?)0+(?=\d)/,'$1');
}
type Props=Omit<InputHTMLAttributes<HTMLInputElement>,'type'|'value'|'onChange'> & {
  value:number|string;
  onChange: (event:ChangeEvent<HTMLInputElement>)=>void;
};
export default function NumericInput({value,onChange,onFocus,onBlur,inputMode,step,...props}:Props){
  const [draft,setDraft]=useState<string|null>(null);
  const input=useRef<HTMLInputElement>(null);
  const editing=draft!==null;
  return <input {...props} ref={input} type="number" step={step}
    inputMode={inputMode??(String(step??'1')==='1'?'numeric':'decimal')}
    value={editing?draft:String(value)}
    onFocus={event=>{
      setDraft(event.currentTarget.value);
      if(event.currentTarget.value==='0')event.currentTarget.select();
      onFocus?.(event);
    }}
    onChange={event=>{
      const raw=event.currentTarget.value;
      const clean=normalizeNumericDraft(raw);
      if(clean!==raw)event.currentTarget.value=clean;
      setDraft(clean);
      // A temporarily invalid number must not mutate domain data. Empty valid
      // drafts continue to use existing form rules (required/optional).
      if(!event.currentTarget.validity.badInput)onChange(event);
    }}
    onBlur={event=>{
      const clean=normalizeNumericDraft(event.currentTarget.value);
      if(clean!==event.currentTarget.value)event.currentTarget.value=clean;
      setDraft(null);onBlur?.(event);
    }}/>;
}
