
import { useEffect,useRef } from 'react';
import { backLayers } from './backLayers';

export function useBackLayer(active:boolean,priority:number,onBack:()=>void){
  const callback=useRef(onBack);
  callback.current=onBack;
  useEffect(()=>{
    if(!active)return;
    return backLayers.add(priority,()=>callback.current());
  },[active,priority]);
}
