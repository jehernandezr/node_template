import { Clock, TransactionManager } from '@platform/kernel';

/**
 * Dependencias que el servicio puede no proveer. Sin `Clock` los proveedores
 * usan el reloj del sistema; sin `TransactionManager` el router guarda el
 * resultado fuera de una unidad de trabajo.
 */
export class InternalApiOptionalDependency {
  static readonly CLOCK = { token: Clock, optional: true } as const;
  static readonly TRANSACTIONS = {
    token: TransactionManager,
    optional: true,
  } as const;
}
