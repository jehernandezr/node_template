import type { DirectoryStore } from './ports.js';
import type { TenantPlacement } from './types.js';

/** In-memory {@link DirectoryStore} with setters, intended for tests and local setups. */
export class InMemoryDirectoryStore implements DirectoryStore {
  private readonly placements = new Map<string, TenantPlacement>();
  private readonly instances = new Map<string, string>();

  setPlacement(placement: TenantPlacement): void {
    this.placements.set(placement.tenantId, placement);
  }

  removePlacement(tenantId: string): void {
    this.placements.delete(tenantId);
  }

  setInstance(logicalShard: string, instance: string): void {
    this.instances.set(logicalShard, instance);
  }

  removeInstance(logicalShard: string): void {
    this.instances.delete(logicalShard);
  }

  async getPlacement(tenantId: string): Promise<TenantPlacement | undefined> {
    return this.placements.get(tenantId);
  }

  async getInstance(logicalShard: string): Promise<string | undefined> {
    return this.instances.get(logicalShard);
  }
}
