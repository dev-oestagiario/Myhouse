import {describe,it,expect} from 'vitest';
import {keyboardPhaseAfterFocus,shouldHideNavigation} from './keyboardViewport';
describe('visibilidade do teclado',()=>{
  it('oculta barra imediatamente sem esperar resize ou didShow',()=>{
    expect(shouldHideNavigation(keyboardPhaseAfterFocus('idle',true),false)).toBe(true);
    expect(shouldHideNavigation('open',false)).toBe(true);
    expect(shouldHideNavigation('closing',false)).toBe(true);
  });
  it('restaura barra ao fechar mesmo com campo focado',()=>{
    expect(shouldHideNavigation('dismissed',true)).toBe(false);
    expect(shouldHideNavigation(keyboardPhaseAfterFocus('dismissed',true),false)).toBe(true);
    expect(shouldHideNavigation(keyboardPhaseAfterFocus('pending',false),false)).toBe(false);
    expect(shouldHideNavigation('idle',true)).toBe(true);
  });
});
