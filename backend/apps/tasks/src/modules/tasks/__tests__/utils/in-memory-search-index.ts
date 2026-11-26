import {
  SearchIndex,
  type SearchDocument,
  type SearchHit,
  type SearchQuery,
} from '@platform/search';

/**
 * In-memory index that ranks by indexing order and counts reads, to test how the caller walks the
 * ranking. It finds the documents whose text contains the searched text.
 */
export class InMemorySearchIndex extends SearchIndex {
  private readonly documents = new Map<string, SearchDocument>();
  reads = 0;

  override async index(document: SearchDocument): Promise<void> {
    this.documents.set(`${document.collection}:${document.id}`, document);
  }

  override async remove(collection: string, id: string): Promise<void> {
    this.documents.delete(`${collection}:${id}`);
  }

  override async search(query: SearchQuery): Promise<readonly SearchHit[]> {
    this.reads += 1;
    const text = query.text.toLowerCase();
    return [...this.documents.values()]
      .filter(
        (document) =>
          document.collection === query.collection &&
          document.text.toLowerCase().includes(text),
      )
      .slice(query.offset, query.offset + query.limit)
      .map((document) => ({ id: document.id, score: 1 }));
  }
}
