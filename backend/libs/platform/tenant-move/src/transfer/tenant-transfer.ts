import type { DataSource } from 'typeorm';
import type { TransferBudget } from './transfer-budget.js';

/** Un traslado en curso dentro de un servicio: el tenant, su shard de origen y el de destino. */
export interface TenantTransfer {
  readonly moveId: string;
  readonly tenantId: string;
  readonly source: DataSource;
  readonly target: DataSource;
  /** El plazo de la llamada cuando varias copias lo comparten; sin él, cada método abre el suyo. */
  readonly budget?: TransferBudget;
}
