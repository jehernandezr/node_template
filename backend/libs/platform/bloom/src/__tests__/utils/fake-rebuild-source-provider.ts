import { BloomRebuildSourceProvider } from '../../bloom-rebuild-source-provider.js';
import type { BloomRebuildSource } from '../../bloom-rebuild-source.js';

/**
 * Fuente de prueba. Sin argumentos obligatorios para que Nest la instancie como provider: por eso no
 * lleva decoradores, así no se emiten metadatos de parámetros que Nest intentaría resolver.
 */
export class FakeRebuildSourceProvider extends BloomRebuildSourceProvider {
  /** Veces que se pidió una fuente nueva. */
  calls = 0;

  constructor(
    private readonly items: readonly (readonly string[])[] = [
      ['ana@example.com', 'luis@example.com'],
    ],
    private readonly failure?: Error,
  ) {
    super();
  }

  batches(): BloomRebuildSource {
    this.calls += 1;
    return this.generate();
  }

  /** Entrega los lotes; si hay `failure`, lanza al empezar a leer. */
  private async *generate(): AsyncGenerator<readonly string[]> {
    if (this.failure !== undefined) {
      throw this.failure;
    }
    for (const batch of this.items) {
      yield batch;
    }
  }
}
