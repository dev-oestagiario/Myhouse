import { describe, expect, it } from 'vitest';
import { makeDefaultScanDraft, verifyScanDraft } from './roomScan';

const valid = { name: ' Quarto principal ', width: 3.4, length: 4.5, height: 2.7, x: 0, z: -3 };

describe('conferência de medidas do escaneamento', () => {
  it('normaliza o nome e mantém medidas reais conferidas', () => {
    expect(verifyScanDraft(valid)).toEqual({ ...valid, name: 'Quarto principal' });
  });
  it('não cria cômodo sem nome', () => {
    expect(() => verifyScanDraft({ ...valid, name: ' ' })).toThrow('nome');
  });
  it.each(['width', 'length', 'height'] as const)('rejeita %s inválido, nulo e infinito', key => {
    for (const value of [0, -1, 100.01, Number.NaN, Infinity]) {
      expect(() => verifyScanDraft({ ...valid, [key]: value })).toThrow();
    }
  });
  it('rejeita posições não finitas ou fora do intervalo', () => {
    expect(() => verifyScanDraft({ ...valid, x: 101 })).toThrow('Posição X');
    expect(() => verifyScanDraft({ ...valid, z: -101 })).toThrow('Posição Z');
    expect(() => verifyScanDraft({ ...valid, z: Number.NaN })).toThrow();
  });
  it('aceita limites e posições negativas válidos', () => {
    expect(verifyScanDraft({ ...valid, width: 0.1, length: 100, height: 0.1, x: -100, z: 100 }).width).toBe(0.1);
  });
  it('propõe posição não sobreposta como valor ilustrativo para novo cômodo', () => {
    const rooms = [{ id: 'a', name: 'Sala', width: 4, length: 3, height: 2.7, x: 2, z: 0 }];
    expect(makeDefaultScanDraft(rooms).x).toBe(6);
    expect(makeDefaultScanDraft([]).width).toBe(3);
  });
  it('preserva o contorno gerado por câmera sem omiti-lo na persistência', () => {\n    const footprint=[{x:0,z:0},{x:3.4,z:0},{x:3.4,z:4.5},{x:0,z:4.5}];\n    expect(verifyScanDraft({...valid,footprint}).footprint).toEqual(footprint);\n  });
});
