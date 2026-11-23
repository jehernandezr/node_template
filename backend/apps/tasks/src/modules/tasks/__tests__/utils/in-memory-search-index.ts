import {
  SearchIndex,
  type SearchDocument,
  type SearchHit,
  type SearchQuery,
} from '@platform/search';

/**
 * Índice en memoria que rankea por orden de indexado y cuenta las lecturas, para probar cómo recorre el
 * ranking quien lo usa. Encuentra los documentos cuyo texto contiene el buscado.
 */
export class InMemorySearchIndex extends SearchIndex {
  private readonly documents = new Map<string, SearchDocument>();
  reads = 0;

  async index(document: SearchDocument): Promise<void> {
    this.documents.set(`${document.collection}:${document.id}`, document);
  }

  async remove(collection: string, id: string): Promise<void> {
    this.documents.delete(`${collection}:${id}`);
  }

  async search(query: SearchQuery): Promise<readonly SearchHit[]> {
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
