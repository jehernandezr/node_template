import type { TenantPlacement } from '../../model/tenant-placement.js';
import { InMemoryDirectoryStore } from './in-memory-directory-store.js';

/**
 * In-memory directory that counts its reads and can hold back the response of
 * an in-flight read. The number of reads is a requirement (single flight),
 * so the counter is public instead of a `jest.fn`.
 */
export class CountingDirectoryStore extends InMemoryDirectoryStore {
  placementReads = 0;
  instanceReads = 0;
  private gate: Promise<void> | undefined;

  /**
   * From now on, each read reads its value when it starts but does not respond until
   * the returned function is called; that way a test simulates a slow read that returns stale data.
   * @returns the function that releases the held reads.
   */
  hold(): () => void {
    let release!: () => void;
    this.gate = new Promise<void>((resolve) => {
      release = () => {
        this.gate = undefined;
        resolve();
      };
    });
    return release;
  }

  override async getPlacement(
    tenantId: string,
  ): Promise<TenantPlacement | undefined> {
    this.placementReads += 1;
    const gate = this.gate;
    const value = await super.getPlacement(tenantId);
    await gate;
    return value;
  }

  override async getInstance(
    logicalShard: string,
  ): Promise<string | undefined> {
    this.instanceReads += 1;
    const gate = this.gate;
    const value = await super.getInstance(logicalShard);
    await gate;
    return value;
  }
}
