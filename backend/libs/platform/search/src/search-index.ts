import type { SearchDocument } from './search-document.js';
import type { SearchHit } from './search-hit.js';
import type { SearchQuery } from './search-query.js';

/**
 * Search index of a tenant's documents. Writes in the open transaction, so the index
 * changes together with the data it describes.
 */
export abstract class SearchIndex {
  /**
   * Adds the document or replaces its text if it was already there.
   * @param document Collection, id, tenant and text.
   */
  abstract index(document: SearchDocument): Promise<void>;

  /**
   * Removes the document; does not fail if it was not there.
   * @param collection Collection of the document.
   * @param id Document id.
   */
  abstract remove(collection: string, id: string): Promise<void>;

  /**
   * Most relevant documents first; ties broken by id so pagination is stable.
   * @param query Collection, text, filters and page.
   * @returns The hits.
   */
  abstract search(query: SearchQuery): Promise<readonly SearchHit[]>;
}
