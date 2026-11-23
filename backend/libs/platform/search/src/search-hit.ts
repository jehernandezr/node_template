/** Un documento encontrado y su relevancia: mayor es mejor y solo sirve para comparar dentro de una búsqueda. */
export interface SearchHit {
  readonly id: string;
  readonly score: number;
}
