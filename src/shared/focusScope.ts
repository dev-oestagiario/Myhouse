// Keep keyboard and assistive technology inside the active surface.
export function visibleFocusables(root:HTMLElement){
  return Array.from(root.querySelectorAll<HTMLElement>(
    'summary, button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
  )).filter(node=>node.tabIndex>=0&&!node.closest('[inert]')&&node.getClientRects().length>0&&getComputedStyle(node).visibility==='visible');
}

type Lease={count:number;previous:boolean};
const locks=new WeakMap<HTMLElement,Lease>();
export function isolateBackground(elements:HTMLElement[]){
  for(const node of elements){
    const current=locks.get(node);
    if(current)current.count++;
    else{locks.set(node,{count:1,previous:node.inert});node.inert=true;}
  }
  let released=false;
  return ()=>{
    if(released)return;
    released=true;
    for(const node of elements){
      const lease=locks.get(node);
      if(!lease)continue;
      if(--lease.count===0){node.inert=lease.previous;locks.delete(node);}
    }
  };
}

export function trapTab(event:KeyboardEvent,root:HTMLElement){
  if(event.key!=='Tab')return;
  const items=visibleFocusables(root);
  if(!items.length){event.preventDefault();root.focus();return;}
  const first=items[0],last=items[items.length-1];
  const outside=!root.contains(document.activeElement);
  if(event.shiftKey&&(outside||document.activeElement===first)){
    event.preventDefault();last.focus();
  }else if(!event.shiftKey&&(outside||document.activeElement===last)){
    event.preventDefault();first.focus();
  }
}
