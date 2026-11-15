import { describe, expect, it } from 'vitest';
import { applyArMeasurement, validateArMeasurement } from './arcore';

const sample = { method: 'arcore-hit-test', width: 3.238, length: 4.5, depthSupported: true, depthUsed: false };

describe('resultado de medições ARCore', () => {
  it('aceita medições finitas de largura e comprimento e arredonda em centímetros', () => {
    expect(validateArMeasurement(sample)).toEqual({ ...sample, width: 3.24 });
  });
  it('mantém a altura e posição manual sem inventar medidas', () => {
    const original = { name: 'Sala', width: 3, length: 3, height: 2.65, x: 8, z: -2 };
    expect(applyArMeasurement(original, validateArMeasurement(sample))).toEqual({ ...original, width: 3.24, length: 4.5 });
  });
  it('rejeita medidas incompletas, não finitas, fora do limite e métodos falsos', () => {
    for (const bad of [
      null, {}, { ...sample, method: 'video' }, { ...sample, width: NaN },
      { ...sample, width: 0 }, { ...sample, length: Infinity },
      { ...sample, length: 120 }, { ...sample, width: '4.2' },
    ]) expect(() => validateArMeasurement(bad)).toThrow();
  });
  it('não declara profundidade usada apenas por estar disponível', () => {
    const result = validateArMeasurement({ ...sample, depthUsed: undefined });
    expect(result.depthSupported).toBe(true);
    expect(result.depthUsed).toBe(false);
  });
});
