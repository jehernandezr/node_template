import { TenantStatus } from '../model/tenant-status.enum.js';
import { TenantWriteGate } from '../ports/tenant-write-gate.js';
import type { ShardRouter } from '../shard-router.js';
import type { PlacementTransition } from './placement-transition.js';

/**
 * Compuerta en el directorio de shards: cerrar es dejar el placement en `Migrating`. Los procesos se enteran
 * por el canal de cambios del router, y el placement en caché basta para decidir si esperar.
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
