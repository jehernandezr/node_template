import {
  TenantMoveManifest,
  type TenantMoveTable,
} from '@platform/tenant-move';

/**
 * Las tablas de shard de __name__ que viajan con un tenant, los padres antes que los hijos. Cada módulo que crea
 * una tabla de tenant la agrega aquí.
 */
export class __Name__TenantMoveManifest extends TenantMoveManifest {
  private static readonly TABLES: readonly TenantMoveTable[] = [];

  tables(): readonly TenantMoveTable[] {
    return __Name__TenantMoveManifest.TABLES;
  }
}
