import type {
  BloomRebuildSource,
  RebuildableBloomFilter,
} from '@platform/bloom';

/**
 * Bloom en memoria de las sesiones revocadas de este proceso. Un "no" es
 * definitivo; un "quizás" se confirma contra Valkey. Mientras no se haya
 * reconstruido una vez (`isWarm` es `false`) no sirve para descartar nada.
 */
export class RevokedSessionRegistry {
  private warm = false;
  /**
   * Revocaciones avisadas durante la reconstrucción en curso. El intercambio de
   * filtros descarta lo agregado al viejo y el índice pudo leerse antes de que
   * llegaran, así que se recuerdan aparte hasta reaplicarlas al filtro nuevo.
   */
  private pending: Set<string> | undefined;
  private rebuilding: Promise<void> | undefined;

  constructor(private readonly filter: RebuildableBloomFilter) {}

  isWarm(): boolean {
    return this.warm;
  }

  async add(sessionId: string): Promise<void> {
    this.pending?.add(sessionId);
    await this.filter.add(sessionId);
  }

  async mightContain(sessionId: string): Promise<boolean> {
    if (this.pending?.has(sessionId) === true) {
      return true;
    }
    return this.filter.mightContain(sessionId);
  }

  /**
   * Reconstruye el filtro desde `source` y lo marca como lleno. Dos llamadas
   * simultáneas comparten la misma reconstrucción.
   * @throws el error de `source`; el filtro anterior se conserva.
   */
  rebuild(source: BloomRebuildSource): Promise<void> {
    if (this.rebuilding === undefined) {
      this.rebuilding = this.replace(source).finally(() => {
        this.rebuilding = undefined;
      });
    }
    return this.rebuilding;
  }

  private async replace(source: BloomRebuildSource): Promise<void> {
    const pending = new Set<string>();
    this.pending = pending;
    try {
      await this.filter.rebuild(source);
      await this.filter.addMany([...pending]);
      this.warm = true;
    } finally {
      this.pending = undefined;
    }
  }
}
