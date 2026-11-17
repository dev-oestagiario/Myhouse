
import { describe, expect, it, vi } from 'vitest';
import { BackLayers } from './backLayers';

describe('prioridade do botão Voltar',()=>{
  it('fecha somente a camada superior e limpa inscrições',()=>{
    const registry=new BackLayers();
    const editor=vi.fn(),menu=vi.fn(),modal=vi.fn();
    const removeEditor=registry.add(30,editor);
    const removeMenu=registry.add(80,menu);
    const removeModal=registry.add(100,modal);
    expect(registry.handle()).toBe(true);
    expect(modal).toHaveBeenCalledOnce();
    expect(menu).not.toHaveBeenCalled();
    expect(editor).not.toHaveBeenCalled();
    removeModal();registry.handle();expect(menu).toHaveBeenCalledOnce();
    removeMenu();registry.handle();expect(editor).toHaveBeenCalledOnce();
    removeEditor();expect(registry.handle()).toBe(false);
  });
  it('gives equal priority to the most recently opened layer',()=>{
    const registry=new BackLayers(),first=vi.fn(),last=vi.fn();
    registry.add(100,first);
    const off=registry.add(100,last);
    registry.handle();expect(last).toHaveBeenCalledOnce();expect(first).not.toHaveBeenCalled();
    off();off();registry.handle();expect(first).toHaveBeenCalledOnce();
  });
});
