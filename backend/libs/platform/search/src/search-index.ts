import type { SearchDocument } from './search-document.js';
import type { SearchHit } from './search-hit.js';
import type { SearchQuery } from './search-query.js';

/**
 * Índice de búsqueda de los documentos de un tenant. Escribe en la transacción abierta, así que el índice
 * cambia junto con el dato que describe.
 */
export abstract class SearchIndex {
  /** Agrega el documento o reemplaza su texto si ya estaba. */
  abstract index(document: SearchDocument): Promise<void>;

  /** Quita el documento; no falla si no estaba. */
  abstract remove(collection: string, id: string): Promise<void>;

  /** Los documentos más relevantes primero; empate por id para que la paginación sea estable. */
  abstract search(query: SearchQuery): Promise<readonly SearchHit[]>;
}
