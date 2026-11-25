import { TenantStatus } from '../model/tenant-status.enum.js';
import { TenantWriteGate } from '../ports/tenant-write-gate.js';
import type { ShardRouter } from '../shard-router.js';
import type { PlacementTransition } from './placement-transition.js';

/**
 * Gate in the shard directory: closing it means leaving the placement in `Migrating`. Processes learn about it
 * through the router change channel, and the cached placement is enough to decide whether to wait.
 */
export class DirectoryWriteGate extends TenantWriteGate {
  constructor(
    private readonly router: ShardRouter,
    private readonly transition: PlacementTransition,
  ) {
    super();
  }

  async isClosed(tenantId: string): Promise<boolean> {
    const placement = await this.router.placement(tenantId);
    return placement.status === TenantStatus.Migrating;
  }

  async close(tenantId: string): Promise<void> {
    await this.transition.apply(tenantId, (current) =>
      current.status === TenantStatus.Migrating
        ? undefined
        : { status: TenantStatus.Migrating },
    );
  }

  async open(tenantId: string): Promise<void> {
    await this.transition.apply(tenantId, (current) =>
      current.status === TenantStatus.Active
        ? undefined
        : { status: TenantStatus.Active },
    );
  }
}
