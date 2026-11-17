import {useCallback,useEffect,useState} from 'react';
import type {FeedbackTone} from './UiState';
export function useNotice(duration=6500){
  const [notice,setNotice]=useState<{message:string;tone:FeedbackTone}|null>(null);
  const show=useCallback((message:string,tone:FeedbackTone='success')=>{setNotice(message?{message,tone}:null);},[]);
  const clear=useCallback(()=>setNotice(null),[]);
  useEffect(()=>{
    if(!notice||notice.tone==='error'||notice.tone==='warning')return;
    const timer=window.setTimeout(clear,duration);
    return()=>window.clearTimeout(timer);
  },[notice,clear,duration]);
  return {notice,show,clear};
}
