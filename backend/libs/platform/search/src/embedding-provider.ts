/** Converts text into vectors for semantic search. All vectors have `dimensions` components. */
export abstract class EmbeddingProvider {
  abstract readonly dimensions: number;

  /**
   * Computes the embedding vector of a text.
   * @param text Text to embed.
   * @returns The vector.
   */
  abstract embed(text: string): Promise<readonly number[]>;
}
