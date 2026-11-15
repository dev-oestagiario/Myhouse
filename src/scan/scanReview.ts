import type { RoomScanDraft } from './roomScan';
import { getFootprint, polygonArea } from '../plan/geometry';

/** Reescala o contorno junto às dimensões corrigidas, inclusive após o campo ser limpo. */
export function resizeScanDraft(draft: RoomScanDraft, key: 'width' | 'length' | 'height', value: number): RoomScanDraft {
  const next: RoomScanDraft = { ...draft, [key]: value };
  if (!draft.footprint || key === 'height' || !Number.isFinite(value) || value <= 0) return next;
  const coordinate = key === 'width' ? 'x' : 'z';
  const current = Math.max(...draft.footprint.map(point => point[coordinate]));
  if (current <= 0) return next;
  const scale = value / current;
  next.footprint = draft.footprint.map(point => ({
    x: key === 'width' ? point.x * scale : point.x,
    z: key === 'length' ? point.z * scale : point.z,
  }));
  return next;
}

export type ScanReviewMetrics = {
  area: number;
  perimeter: number;
  customFootprint: boolean;
  vertices: number;
};

export function getScanReviewMetrics(draft: RoomScanDraft): ScanReviewMetrics {
  const vertices = getFootprint(draft);
  const perimeter = vertices.reduce((sum, current, index) => {
    const next = vertices[(index + 1) % vertices.length];
    return sum + Math.hypot(current.x - next.x, current.z - next.z);
  }, 0);
  return {
    area: Math.abs(polygonArea(vertices)),
    perimeter,
    customFootprint: Boolean(draft.footprint),
    vertices: vertices.length,
  };
}

export function dimensionDifference(estimated: number, confirmed: number): number {
  if (!(estimated > 0) || !Number.isFinite(confirmed)) return 0;
  return Math.abs((confirmed - estimated) / estimated) * 100;
}
