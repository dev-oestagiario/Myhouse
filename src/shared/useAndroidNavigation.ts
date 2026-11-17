
import { useEffect,useRef } from 'react';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { backLayers } from './backLayers';

export function useAndroidNavigation(onParent:()=>boolean) {
  const parentRef=useRef(onParent);
  parentRef.current=onParent;
  useEffect(()=>{
    const android=Capacitor.getPlatform()==='android';
    let disposed=false;
    let keyboardOpen=false;
    const handles:PluginListenerHandle[]=[];
    const root=document.documentElement;
    const remember=(promise:Promise<PluginListenerHandle>)=>{void promise.then(handle=>{
      if(disposed)void handle.remove();else handles.push(handle);
    }).catch(()=>{/* WebView still supports ordinary navigation and viewport resizing. */});};
    const syncViewport=()=>{
      const viewport=window.visualViewport;
      const height=viewport?.height??window.innerHeight;
      root.style.setProperty('--myhouse-visible-height',Math.round(height)+'px');
      root.style.setProperty('--myhouse-visible-top',Math.round(viewport?.offsetTop??0)+'px');
      const active=document.activeElement;
      const typing=active instanceof HTMLElement&&active.matches('input:not([type=checkbox]):not([type=radio]):not([type=file]),textarea,[contenteditable=true]');
      const occluded=Boolean(typing&&viewport&&window.innerHeight-height>120);
      root.classList.toggle('myhouse-keyboard-open',keyboardOpen||occluded);
    };
    const back=(native:boolean)=>{
      if(native&&(keyboardOpen||root.classList.contains('myhouse-keyboard-open'))){
        void Keyboard.hide().catch(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});
        return;
      }
      if(backLayers.handle())return;
      if(parentRef.current())return;
      // Keep the authenticated session and in-memory draft when leaving the home screen.
      if(native)void NativeApp.minimizeApp().catch(()=>{});
    };
    const key=(event:KeyboardEvent)=>{
      if(event.altKey&&event.key==='ArrowLeft'&&!event.repeat){
        event.preventDefault();back(false);
      }
    };
    const show=()=>{keyboardOpen=true;syncViewport();};
    const hide=()=>{keyboardOpen=false;syncViewport();};
    if(android){
      remember(NativeApp.addListener('backButton',()=>back(true)));
      remember(Keyboard.addListener('keyboardDidShow',show));
      remember(Keyboard.addListener('keyboardDidHide',hide));
    }
    document.addEventListener('keydown',key);
    window.addEventListener('resize',syncViewport);
    window.visualViewport?.addEventListener('resize',syncViewport);
    window.visualViewport?.addEventListener('scroll',syncViewport);
    document.addEventListener('focusin',syncViewport);
    document.addEventListener('focusout',syncViewport);
    syncViewport();
    return ()=>{
      disposed=true;handles.forEach(handle=>void handle.remove());
      document.removeEventListener('keydown',key);
      window.removeEventListener('resize',syncViewport);
      window.visualViewport?.removeEventListener('resize',syncViewport);
      window.visualViewport?.removeEventListener('scroll',syncViewport);
      document.removeEventListener('focusin',syncViewport);
      document.removeEventListener('focusout',syncViewport);
      root.classList.remove('myhouse-keyboard-open');
      root.style.removeProperty('--myhouse-visible-height');
      root.style.removeProperty('--myhouse-visible-top');
    };
  },[]);
}
