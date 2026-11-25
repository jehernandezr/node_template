import type { SearchDocument } from './search-document.js';
import type { SearchHit } from './search-hit.js';
import type { SearchQuery } from './search-query.js';

/**
 * Search index of a tenant's documents. Writes in the open transaction, so the index
 * changes together with the data it describes.
 */
export abstract class SearchIndex {
  /** Adds the document or replaces its text if it was already there. */
  abstract index(document: SearchDocument): Promise<void>;

  /** Removes the document; does not fail if it was not there. */
  abstract remove(collection: string, id: string): Promise<void>;

  /** Most relevant documents first; ties broken by id so pagination is stable. */
  abstract search(query: SearchQuery): Promise<readonly SearchHit[]>;
}
