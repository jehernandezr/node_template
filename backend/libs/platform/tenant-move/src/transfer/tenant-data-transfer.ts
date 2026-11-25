import type {
  TenantMoveProgress,
  TenantMoveVerification,
} from '@contracts/platform';
import type { DataSource } from 'typeorm';
import type { TenantTransfer } from './tenant-transfer.js';
import type { TransferBudget } from './transfer-budget.js';

/**
 * Copia los datos de un tenant de su shard de origen al de destino, según el manifiesto del servicio. Cada método
 * trabaja dentro del plazo de una llamada y es idempotente: repetirlo continúa donde quedó.
 */
export abstract class TenantDataTransfer {
  /**
   * Una ronda de copia mientras las escrituras siguen.
   * @throws TenantMoveError `RoundPending` si la ronda no terminó en el plazo.
   */
  abstract sync(transfer: TenantTransfer): Promise<TenantMoveProgress>;

  /**
   * La última ronda y la verificación, con el tenant ya congelado en el origen.
   * @throws TenantMoveError `RoundPending` si no terminó en el plazo; la llamada siguiente sigue donde quedó.
   */
  abstract verify(transfer: TenantTransfer): Promise<TenantMoveVerification>;

  /** Descarta lo copiado al destino. */
  abstract abort(transfer: TenantTransfer): Promise<void>;

  /**
   * Borra los datos del tenant que quedaron en el origen después del traslado, dentro de `budget` si se da.
   * @throws TenantMoveError `RoundPending` si no terminó en el plazo; la llamada siguiente sigue donde quedó.
   */
  abstract cleanup(
    tenantId: string,
    source: DataSource,
    budget?: TransferBudget,
  ): Promise<void>;

  /** Cambia a `region` las columnas de región que declara el manifiesto, en las filas del tenant en `target`. */
  abstract assignRegion(
    tenantId: string,
    target: DataSource,
    region: string,
  ): Promise<void>;
}
