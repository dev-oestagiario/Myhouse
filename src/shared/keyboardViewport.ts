export function isTextEntry(target:Element|null):target is HTMLElement{
  if(!(target instanceof HTMLElement))return false;
  if(target.isContentEditable)return true;
  if(target instanceof HTMLTextAreaElement)return !target.disabled&&!target.readOnly&&target.inputMode!=='none';
  return target instanceof HTMLInputElement&&!target.disabled&&!target.readOnly&&target.inputMode!=='none'&&
    ['text','search','email','url','tel','password','number'].includes(target.type);
}
export type KeyboardPhase='idle'|'pending'|'open'|'closing'|'dismissed';
export function keyboardPhaseAfterFocus(previous:KeyboardPhase,typing:boolean):KeyboardPhase{
  if(typing)return previous==='open'||previous==='closing'?previous:'pending';
  return previous==='open'||previous==='closing'?previous:'idle';
}
export function shouldHideNavigation(phase:KeyboardPhase,occluded:boolean){
  return phase==='pending'||phase==='open'||phase==='closing'||(phase!=='dismissed'&&occluded);
}
