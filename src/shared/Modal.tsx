import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useBackLayer } from './useBackLayer';
import {isolateBackground,trapTab,visibleFocusables} from './focusScope';

function fieldSnapshot(node:HTMLElement|null) {
  return JSON.stringify(Array.from(node?.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input:not([type=file]),select,textarea')??[]).map(field=>[field.value,field instanceof HTMLInputElement?field.checked:null]));
}

export default function Modal({ title, onClose, children }: { title: string, onClose: () => void, children: ReactNode }) {
  const dialog = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const initial=useRef<string|null>(null);
  function requestClose() {
    if(initial.current!==null&&fieldSnapshot(dialog.current)!==initial.current&&!window.confirm('Há alterações neste formulário. Descartar e voltar?'))return;
    closeRef.current();
  }
  useBackLayer(true,100,requestClose);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    initial.current=fieldSnapshot(dialog.current);
    const surface=dialog.current;
    const backdrop=surface?.parentElement;
    if(!surface||!backdrop)return;
    (visibleFocusables(surface)[0]??surface).focus({preventScroll:true});
    const release=isolateBackground(Array.from(document.body.children).filter((node):node is HTMLElement=>node instanceof HTMLElement&&node!==backdrop&&!['SCRIPT','STYLE','LINK'].includes(node.tagName)));
    const onKeyDown=(event:KeyboardEvent)=>{
      // An outer modal must never process keyboard input belonging to an inner one.
      if(backdrop.inert)return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();requestClose();return;}
      trapTab(event,surface);
    };
    document.addEventListener('keydown',onKeyDown);
    return ()=>{
      document.removeEventListener('keydown',onKeyDown);
      document.body.style.overflow=previousOverflow;
      release();
      if(previous?.isConnected)previous.focus({preventScroll:true});
    };
  }, []);
  return createPortal(<div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) requestClose(); }}>
    <section ref={dialog} tabIndex={-1} className="modal" role="dialog" aria-modal="true" aria-label={title}
      onInvalidCapture={event=>{
        let parent=(event.target as HTMLElement).parentElement;
        while(parent){if(parent instanceof HTMLDetailsElement)parent.open=true; if(parent===dialog.current)break; parent=parent.parentElement;}
      }}
      onClickCapture={event=>{
        const button=(event.target as HTMLElement).closest('button');
        if(button?.type==='button'&&button.textContent?.trim()==='Cancelar'&&button.closest('form')){
          event.preventDefault();event.stopPropagation();requestClose();
        }
      }}>
      <div className="modal-heading"><button type="button" className="icon-button modal-back-button" onClick={requestClose} aria-label="Fechar janela"><ArrowLeft size={22}/></button><h2>{title}</h2></div>
      {children}
    </section>
  </div>,document.body);
}

