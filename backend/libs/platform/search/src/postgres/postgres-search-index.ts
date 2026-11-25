import {
  TenantIsolatedRepository,
  type RepositoryKit,
} from '@platform/persistence';
import { SearchIndex } from '../search-index.js';
import type { SearchDocument } from '../search-document.js';
import type { SearchHit } from '../search-hit.js';
import type { SearchLanguage } from '../search-language.enum.js';
import type { SearchQuery } from '../search-query.js';
import { SearchSchema } from '../search-schema.js';

interface HitRow {
  readonly id: string;
  readonly score: string | number;
}

/** What both modes share over `search_documents`: insert, replace and delete in the tenant's shard. */
export abstract class PostgresSearchIndex extends SearchIndex {
  private readonly repository: SearchRowRepository;

  protected constructor(
    kit: RepositoryKit,
    protected readonly language: SearchLanguage,
  ) {
    super();
    this.repository = new SearchRowRepository(kit);
  }

  async index(document: SearchDocument): Promise<void> {
    const embedding = await this.embeddingOf(document.text);
    await this.repository.upsert(document, embedding);
  }

  remove(collection: string, id: string): Promise<void> {
    return this.repository.delete(collection, id);
  }

  async search(query: SearchQuery): Promise<readonly SearchHit[]> {
    const rows = await this.repository.select<HitRow>(
      await this.rankingSql(query),
    );
    return rows.map((row) => ({ id: row.id, score: Number(row.score) }));
  }

  /** Vector of the text in pgvector format, or `null` if the mode does not use it. */
  protected abstract embeddingOf(text: string): Promise<string | null>;

  /** Query that returns `id` and `score` of the requested page, with `$1` the tenant and `$2` the collection. */
  protected abstract rankingSql(query: SearchQuery): Promise<RankingSql>;
}

/** SQL of a search and its parameters, in order. */
export interface RankingSql {
  readonly sql: string;
  readonly parameters: readonly unknown[];
}

/** Access to the `search_documents` rows with the scope's tenant set in the session. */
class SearchRowRepository extends TenantIsolatedRepository {
  constructor(kit: RepositoryKit) {
    super(kit);
  }

  async upsert(
    document: SearchDocument,
    embedding: string | null,
  ): Promise<void> {
    await this.write((manager) =>
      manager.query(
        `INSERT INTO "${SearchSchema.TABLE}" ("tenant_id", "collection", "document_id", "content", "embedding") VALUES ($1, $2, $3, $4, $5::vector) ON CONFLICT ("tenant_id", "collection", "document_id") DO UPDATE SET "content" = EXCLUDED."content", "embedding" = EXCLUDED."embedding", "updated_at" = now()`,
        [
          this.tenantId(),
          document.collection,
          document.id,
          document.text,
          embedding,
        ],
      ),
    );
  }

  async delete(collection: string, id: string): Promise<void> {
    await this.write((manager) =>
      manager.query(
        `DELETE FROM "${SearchSchema.TABLE}" WHERE "tenant_id" = $1 AND "collection" = $2 AND "document_id" = $3`,
        [this.tenantId(), collection, id],
      ),
    );
  }

  select<T>(ranking: RankingSql): Promise<T[]> {
    return this.read(
      (manager) =>
        manager.query(ranking.sql, [
          this.tenantId(),
          ...ranking.parameters,
        ]) as Promise<T[]>,
    );
  }
}
