import { Capacitor, registerPlugin } from '@capacitor/core';
import type { RoomScanDraft } from './roomScan';

export type ArSupport = {
  supported: boolean;
  installed: boolean;
  status: string;
};

export type ArMeasurements = {
  width: number;
  length: number;
  depthSupported: boolean;
  depthUsed: boolean;
  method: 'arcore-hit-test';
};

type RoomARBridge = {
  availability(): Promise<ArSupport>;
  measure(): Promise<unknown>;
};

const roomAR = registerPlugin<RoomARBridge>('RoomAR');

/** Do not infer ARCore compatibility from the browser or Android version. */
export async function getArSupport(): Promise<ArSupport> {
  if (Capacitor.getPlatform() !== 'android') {
    return { supported: false, installed: false, status: 'NOT_ANDROID' };
  }
  try {
    return await roomAR.availability();
  } catch {
    return { supported: false, installed: false, status: 'NATIVE_PLUGIN_UNAVAILABLE' };
  }
}

export async function requestArMeasurement(): Promise<ArMeasurements> {
  const raw = await roomAR.measure();
  return validateArMeasurement(raw);
}

/** Native measurements must be treated as estimates and checked before saving. */
export function validateArMeasurement(raw: unknown): ArMeasurements {
  if (!raw || typeof raw !== 'object') throw new Error('Medição AR inválida.');
  const value = raw as Partial<ArMeasurements>;
  if (value.method !== 'arcore-hit-test') throw new Error('Método de medição AR desconhecido.');
  for (const size of [value.width, value.length]) {
    if (typeof size !== 'number' || !Number.isFinite(size) || size < 0.1 || size > 100) {
      throw new Error('Medidas AR fora do intervalo permitido.');
    }
  }
  return {
    method: 'arcore-hit-test',
    width: Math.round(value.width! * 100) / 100,
    length: Math.round(value.length! * 100) / 100,
    depthSupported: value.depthSupported === true,
    depthUsed: value.depthUsed === true,
  };
}

export function applyArMeasurement(draft: RoomScanDraft, measurement: ArMeasurements): RoomScanDraft {
  return { ...draft, width: measurement.width, length: measurement.length };
}
