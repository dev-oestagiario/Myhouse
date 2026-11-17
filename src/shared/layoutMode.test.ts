import {describe,it,expect} from 'vitest';
import {resolveMobileLayout} from './layoutMode';
describe('navegação por plataforma e viewport',()=>{
  it('mantém Android e iOS em layout mobile independentemente do viewport',()=>{
    expect(resolveMobileLayout('android',false)).toBe(true);
    expect(resolveMobileLayout('android',true)).toBe(true);
    expect(resolveMobileLayout('ios',false)).toBe(true);
  });
  it('preserva desktop web e adapta navegação web compacta',()=>{
    expect(resolveMobileLayout('web',false)).toBe(false);
    expect(resolveMobileLayout('web',true)).toBe(true);
  });
});
