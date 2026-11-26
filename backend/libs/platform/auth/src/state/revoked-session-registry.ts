import type {
  BloomRebuildSource,
  RebuildableBloomFilter,
} from '@platform/bloom';

/**
 * In-memory Bloom of this process's revoked sessions. A "no" is
 * definitive; a "maybe" is confirmed against Valkey. Until it has been
 * rebuilt once (`isWarm` is `false`) it cannot rule anything out.
 */
export class RevokedSessionRegistry {
  private warm = false;
  /**
   * Revocations announced during the rebuild in progress. Swapping
   * filters discards what was added to the old one and the index may have been read before
   * they arrived, so they are remembered separately until reapplied to the new filter.
   */
  private pending: Set<string> | undefined;
  private rebuilding: Promise<void> | undefined;

  constructor(private readonly filter: RebuildableBloomFilter) {}

  /**
   * Tells whether the filter was filled at least once.
   * @returns `true` when warm.
   */
  isWarm(): boolean {
    return this.warm;
  }

  /**
   * Adds a revoked session.
   * @param sessionId Session id.
   */
  async add(sessionId: string): Promise<void> {
    this.pending?.add(sessionId);
    await this.filter.add(sessionId);
  }

  /**
   * Tells whether a session might be revoked; a cold filter answers `true`.
   * @param sessionId Session id.
   * @returns Whether it might be revoked.
   */
  async mightContain(sessionId: string): Promise<boolean> {
    if (this.pending?.has(sessionId) === true) {
      return true;
    }
    return this.filter.mightContain(sessionId);
  }

  /**
   * Rebuilds the filter from `source` and marks it as filled. Two concurrent
   * calls share the same rebuild.
   * @param source Revoked sessions.
   * @throws the error from `source`; the previous filter is kept.
   */
  rebuild(source: BloomRebuildSource): Promise<void> {
    if (this.rebuilding === undefined) {
      this.rebuilding = this.replace(source).finally(() => {
        this.rebuilding = undefined;
      });
    }
    return this.rebuilding;
  }

  private async replace(source: BloomRebuildSource): Promise<void> {
    const pending = new Set<string>();
    this.pending = pending;
    try {
      await this.filter.rebuild(source);
      await this.filter.addMany([...pending]);
      this.warm = true;
    } finally {
      this.pending = undefined;
    }
  }
}
