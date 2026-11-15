import { describe, expect, it } from 'vitest';
import { chooseLiveScanMode, describeLiveScanMode } from './liveScan';

describe('seleção automática do escaneamento ao vivo', () => {
  it('aguarda a verificação nativa antes de selecionar o modo', () => {
    expect(chooseLiveScanMode(null)).toBe('checking');
  });
  it('utiliza ARCore somente quando confirmado como suportado', () => {
    expect(chooseLiveScanMode({ supported: true, installed: false, status: 'SUPPORTED_NOT_INSTALLED' })).toBe('arcore');
    expect(chooseLiveScanMode({ supported: true, installed: true, status: 'SUPPORTED_INSTALLED' })).toBe('arcore');
  });
  it('usa câmera comum quando o ARCore está ausente ou não há ponte nativa', () => {
    expect(chooseLiveScanMode({ supported: false, installed: false, status: 'UNSUPPORTED_DEVICE_NOT_CAPABLE' })).toBe('camera');
    expect(chooseLiveScanMode({ supported: false, installed: false, status: 'NATIVE_PLUGIN_UNAVAILABLE' })).toBe('camera');
  });
  it('não anuncia reconstrução como funcionalidade já implementada', () => {
    expect(describeLiveScanMode('camera')).toContain('etapa 2');
  });
});
