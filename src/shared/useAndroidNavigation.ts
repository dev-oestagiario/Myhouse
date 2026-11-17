import {useEffect,useRef} from 'react';
import {Capacitor,type PluginListenerHandle} from '@capacitor/core';
import {App as NativeApp} from '@capacitor/app';
import {Keyboard} from '@capacitor/keyboard';
import {backLayers} from './backLayers';
import {getMobileLayout} from './layoutMode';
import {isTextEntry,keyboardPhaseAfterFocus,shouldHideNavigation,type KeyboardPhase} from './keyboardViewport';

export function useAndroidNavigation(onParent:()=>boolean){
  const parentRef=useRef(onParent);parentRef.current=onParent;
  useEffect(()=>{
    const android=Capacitor.getPlatform()==='android';
    let disposed=false,frame=0;
    let phase:KeyboardPhase='idle';
    let baselineWidth=window.innerWidth,baselineHeight=window.innerHeight;
    let lastHeight='',lastTop='',occluded=false;
    const handles:PluginListenerHandle[]=[];
    const root=document.documentElement;
    const remember=(promise:Promise<PluginListenerHandle>)=>{void promise.then(handle=>{
      if(disposed)void handle.remove();else handles.push(handle);
    }).catch(()=>{/* Browser fallback remains available. */});};
    const applyKeyboard=()=>root.classList.toggle('myhouse-keyboard-open',getMobileLayout()&&shouldHideNavigation(phase,occluded));
    const syncViewport=()=>{
      frame=0;
      const viewport=window.visualViewport;
      const height=Math.round(Math.min(window.innerHeight,viewport?.height??window.innerHeight));
      const top=Math.max(0,Math.round(viewport?.offsetTop??0));
      const width=window.innerWidth;
      const typing=isTextEntry(document.activeElement);
      if(Math.abs(width-baselineWidth)>40){baselineWidth=width;baselineHeight=window.innerHeight;}
      if(!typing&&phase==='idle')baselineHeight=window.innerHeight;
      if(phase==='dismissed'&&height>=baselineHeight-80)baselineHeight=window.innerHeight;
      occluded=typing&&(baselineHeight-height>80||window.innerHeight-height>80);
      const h=height+'px',t=top+'px';
      if(lastHeight!==h){lastHeight=h;root.style.setProperty('--myhouse-visible-height',h);}
      if(lastTop!==t){lastTop=t;root.style.setProperty('--myhouse-visible-top',t);}
      applyKeyboard();
    };
    const schedule=()=>{if(!frame)frame=window.requestAnimationFrame(syncViewport);};
    const focusIn=(event:FocusEvent)=>{
      if(!getMobileLayout()||!isTextEntry(event.target as Element))return;
      phase=keyboardPhaseAfterFocus(phase,true);applyKeyboard();schedule();
    };
    const focusOut=()=>{queueMicrotask(()=>{
      if(disposed)return;
      if(!isTextEntry(document.activeElement)){
        phase=keyboardPhaseAfterFocus(phase,false);applyKeyboard();schedule();
      }
    });};
    const show=()=>{phase='open';applyKeyboard();schedule();};
    const willHide=()=>{phase='closing';applyKeyboard();schedule();};
    const hide=()=>{phase='dismissed';occluded=false;applyKeyboard();schedule();};
    const pointer=(event:PointerEvent)=>{
      if(phase==='dismissed'&&getMobileLayout()&&isTextEntry(event.target as Element)){
        phase='pending';applyKeyboard();schedule();
      }
    };
    const back=(native:boolean)=>{
      if(native&&(phase==='open'||phase==='pending'||phase==='closing'||(occluded&&phase!=='dismissed'))){
        if(isTextEntry(document.activeElement))document.activeElement.blur();
        void Keyboard.hide().then(hide).catch(hide);return;
      }
      if(backLayers.handle())return;
      if(parentRef.current())return;
      if(native)void NativeApp.minimizeApp().catch(()=>{});
    };
    const key=(event:KeyboardEvent)=>{
      if(event.altKey&&event.key==='ArrowLeft'&&!event.repeat){event.preventDefault();back(false);}
    };
    if(android){
      remember(NativeApp.addListener('backButton',()=>back(true)));
      remember(Keyboard.addListener('keyboardWillShow',show));
      remember(Keyboard.addListener('keyboardDidShow',show));
      remember(Keyboard.addListener('keyboardWillHide',willHide));
      remember(Keyboard.addListener('keyboardDidHide',hide));
    }
    document.addEventListener('keydown',key);
    document.addEventListener('focusin',focusIn);
    document.addEventListener('focusout',focusOut);
    document.addEventListener('pointerdown',pointer);
    window.addEventListener('resize',schedule);
    window.visualViewport?.addEventListener('resize',schedule);
    window.visualViewport?.addEventListener('scroll',schedule);
    syncViewport();
    return ()=>{
      disposed=true;if(frame)window.cancelAnimationFrame(frame);
      handles.forEach(handle=>void handle.remove());
      document.removeEventListener('keydown',key);
      document.removeEventListener('focusin',focusIn);
      document.removeEventListener('focusout',focusOut);
      document.removeEventListener('pointerdown',pointer);
      window.removeEventListener('resize',schedule);
      window.visualViewport?.removeEventListener('resize',schedule);
      window.visualViewport?.removeEventListener('scroll',schedule);
      root.classList.remove('myhouse-keyboard-open');
      root.style.removeProperty('--myhouse-visible-height');
      root.style.removeProperty('--myhouse-visible-top');
    };
  },[]);
}
