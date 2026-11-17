import {describe,expect,it} from 'vitest';
import {viewerDpr} from './viewerQuality';
describe('limite de resolução 3D',()=>{it('reduz o custo de pixels em telas de toque sem alterar geometria',()=>{expect(viewerDpr(true)).toEqual([1,1.25]);expect(viewerDpr(false)).toEqual([1,1.7]);});});
