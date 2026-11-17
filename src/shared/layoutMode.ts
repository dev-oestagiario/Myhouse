import {Capacitor} from '@capacitor/core';
import {useLayoutEffect,useSyncExternalStore} from 'react';

export const MOBILE_LAYOUT_QUERY='(max-width:820px), (pointer:coarse) and (max-height:600px)';

export function resolveMobileLayout(platform:string,compactViewport:boolean):boolean{
  // Native Android/iOS must never inherit the desktop shell, even with a wide
  // WebView, a tablet, a mouse attached or landscape orientation.
  return platform==='android'||platform==='ios'||compactViewport;
}
export function getMobileLayout():boolean{
  return resolveMobileLayout(Capacitor.getPlatform(),window.matchMedia(MOBILE_LAYOUT_QUERY).matches);
}
export function applyLayoutMode():void{
  document.documentElement.dataset.layout=getMobileLayout()?'mobile':'desktop';
}
function subscribe(callback:()=>void){
  const query=window.matchMedia(MOBILE_LAYOUT_QUERY);
  const change=()=>{applyLayoutMode();callback();};
  query.addEventListener('change',change);
  return ()=>query.removeEventListener('change',change);
}
export function useMobileLayout():boolean{
  const mobile=useSyncExternalStore(subscribe,getMobileLayout,()=>false);
  useLayoutEffect(applyLayoutMode,[mobile]);
  return mobile;
}
