import { createHash } from 'node:crypto';
import { EmbeddingProvider } from '../../embedding-provider.js';
import { SearchSchema } from '../../search-schema.js';

/**
 * Embeddings deterministas sin modelo: cada palabra suma ±1 en una componente elegida por su hash y el
 * vector se normaliza. Textos que comparten palabras quedan cerca, así las pruebas del modo híbrido
 * verifican el orden sin depender de un servicio externo.
 */
export class HashingEmbeddingProvider extends EmbeddingProvider {
  readonly dimensions = SearchSchema.EMBEDDING_DIMENSIONS;

  async embed(text: string): Promise<readonly number[]> {
    const vector = new Array<number>(this.dimensions).fill(0);
    for (const word of HashingEmbeddingProvider.words(text)) {
      const digest = createHash('sha256').update(word).digest();
      const component = digest.readUInt32BE(0) % this.dimensions;
      const sign = (digest.readUInt8(4) & 1) === 0 ? 1 : -1;
      vector[component] = (vector[component] ?? 0) + sign;
    }
    const norm = Math.hypot(...vector);
    return norm === 0 ? vector : vector.map((value) => value / norm);
  }

  private static words(text: string): string[] {
    return text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 0);
  }
}
