import type { ArSupport } from './arcore';

export type LiveScanMode = 'checking' | 'arcore' | 'camera';

/** A checagem nativa determina o modo; nunca presumir suporte a ARCore por user-agent. */
export function chooseLiveScanMode(support: ArSupport | null): LiveScanMode {
  if (support === null) return 'checking';
  return support.supported ? 'arcore' : 'camera';
}

export function describeLiveScanMode(mode: LiveScanMode): string {
  switch (mode) {
    case 'checking': return 'Verificando os recursos do aparelho…';
    case 'arcore': return 'ARCore disponível: use o rastreamento nativo para medir pontos do piso.';
    case 'camera': return 'Câmera ao vivo: o mapeamento visual automático sem ARCore será desenvolvido na etapa 2.';
  }
}
