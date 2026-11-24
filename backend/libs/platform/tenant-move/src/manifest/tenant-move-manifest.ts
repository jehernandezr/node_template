import type { TenantMoveTable } from './tenant-move-table.js';

/**
 * Lo que un servicio declara para trasladar un tenant: sus tablas de shard en orden de dependencia, los padres
 * antes que los hijos. La copia sigue ese orden y el borrado, el inverso.
 */
export abstract class TenantMoveManifest {
  abstract tables(): readonly TenantMoveTable[];
}
