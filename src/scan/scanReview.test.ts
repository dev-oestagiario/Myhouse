import { describe, expect, it } from 'vitest';
import type { RoomScanDraft } from './roomScan';
import { verifyScanDraft } from './roomScan';
import { dimensionDifference, getScanReviewMetrics, resizeScanDraft } from './scanReview';

const draft: RoomScanDraft = {
  name: 'Sala em L', x: 0, z: 0, width: 5, length: 4, height: 2.8,
  footprint: [
    {x:0,z:0},{x:5,z:0},{x:5,z:2},
    {x:3,z:2},{x:3,z:4},{x:0,z:4},
  ],
};

describe('F5 — conferência e persistência geométrica', () => {
  it('corrige a largura mantendo a proporção do cômodo irregular', () => {
    const corrected=resizeScanDraft(draft,'width',3.2);
    expect(corrected.width).toBe(3.2);
    expect(corrected.footprint).toEqual([
      {x:0,z:0},{x:3.2,z:0},{x:3.2,z:2},
      {x:1.92,z:2},{x:1.92,z:4},{x:0,z:4},
    ]);
    expect(() => verifyScanDraft(corrected)).not.toThrow();
    expect(draft.width).toBe(5);
  });
  it('corrige o comprimento e a altura sem deformar os outros eixos', () => {
    const narrower=resizeScanDraft(draft,'length',8);
    expect(narrower.footprint?.[3]).toEqual({x:3,z:4});
    expect(narrower.footprint?.[4]).toEqual({x:3,z:8});
    expect(resizeScanDraft(narrower,'height',3.3).footprint).toEqual(narrower.footprint);
  });
  it('mantém contorno válido se o campo numérico foi temporariamente apagado', () => {
    const empty=resizeScanDraft(draft,'width',0);
    expect(empty.footprint).toEqual(draft.footprint);
    const corrected=resizeScanDraft(empty,'width',4.25);
    expect(corrected.footprint?.[1].x).toBeCloseTo(4.25);
    expect(() => verifyScanDraft(corrected)).not.toThrow();
  });
  it('não transforma valor inválido em coordenadas não finitas', () => {
    const invalid=resizeScanDraft(draft,'width',Number.NaN);
    expect(invalid.footprint).toEqual(draft.footprint);
    expect(() => verifyScanDraft(invalid)).toThrow();
  });
  it('calcula piso, perímetro e alterações relativas com precisão', () => {
    const metrics=getScanReviewMetrics(draft);
    expect(metrics.area).toBeCloseTo(16);
    expect(metrics.perimeter).toBeCloseTo(18);
    expect(metrics.customFootprint).toBe(true);
    expect(metrics.vertices).toBe(6);
    expect(dimensionDifference(4,3.2)).toBeCloseTo(20);
    expect(dimensionDifference(0,3.2)).toBe(0);
  });
  it('preserva backup de sala retangular sem contorno personalizado', () => {
    const legacy={ ...draft, footprint: undefined };
    expect(getScanReviewMetrics(legacy).area).toBe(20);
    expect(getScanReviewMetrics(legacy).customFootprint).toBe(false);
    expect(resizeScanDraft(legacy,'width',4.2).footprint).toBeUndefined();
  });
});
