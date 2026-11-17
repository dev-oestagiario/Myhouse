import {describe,it,expect} from 'vitest';
import {normalizeNumericDraft} from './NumericInput';
describe('rascunho numérico',()=>{
  it('remove zeros à esquerda sem perder vazio, sinal e decimais',()=>{
    for(const [from,to] of [['050','50'],['01','1'],['05','5'],['000','0'],['0.5','0.5'],['-05','-5'],['',''],['0','0'],['10.05','10.05']])expect(normalizeNumericDraft(from)).toBe(to);
  });
});
