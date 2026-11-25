/** Converts text into vectors for semantic search. All vectors have `dimensions` components. */
export abstract class EmbeddingProvider {
  abstract readonly dimensions: number;

  abstract embed(text: string): Promise<readonly number[]>;
}
