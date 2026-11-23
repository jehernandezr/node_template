/** Convierte texto en vectores para la búsqueda semántica. Todos los vectores tienen `dimensions` componentes. */
export abstract class EmbeddingProvider {
  abstract readonly dimensions: number;

  abstract embed(text: string): Promise<readonly number[]>;
}
