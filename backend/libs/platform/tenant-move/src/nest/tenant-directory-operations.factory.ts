import type {
  TenantDirectoryAck,
  TenantDirectoryEntry,
  TenantDirectoryOperations,
  TenantDirectoryRef,
} from '@contracts/platform';
import type { HandlerResult } from '@platform/internal-api';
import { InternalHandler } from '@platform/internal-api/nest';
import { CallOutcome } from '@platform/primitives';
import type { TenantDirectoryEntries } from '../directory/tenant-directory-entries.js';

/** Handlers de las dos operaciones del directorio de tenants de un servicio. */
export interface TenantDirectoryInternalOperations {
  place(
    input: TenantDirectoryEntry,
  ): Promise<HandlerResult<TenantDirectoryAck>>;
  remove(input: TenantDirectoryRef): Promise<HandlerResult<TenantDirectoryAck>>;
}

/**
 * Arma la clase de handlers de las operaciones de un servicio. Cada servicio tiene sus propios ids de operación,
 * así que la clase se crea por servicio y sus métodos se marcan con `@InternalHandler` de esas operaciones.
 */
export class TenantDirectoryOperationsFactory {
  static create(
    operations: TenantDirectoryOperations,
  ): new (
    entries: TenantDirectoryEntries,
  ) => TenantDirectoryInternalOperations {
    class ServiceTenantDirectoryOperations implements TenantDirectoryInternalOperations {
      constructor(private readonly entries: TenantDirectoryEntries) {}

      async place(input: TenantDirectoryEntry) {
        return {
          outcome: CallOutcome.success(await this.entries.place(input)),
        };
      }

      async remove(input: TenantDirectoryRef) {
        return {
          outcome: CallOutcome.success(await this.entries.remove(input)),
        };
      }
    }
    const handlers: readonly (readonly [
      keyof TenantDirectoryInternalOperations,
      TenantDirectoryOperations[keyof TenantDirectoryOperations],
    ])[] = [
      ['place', operations.tenantDirectoryPlace],
      ['remove', operations.tenantDirectoryRemove],
    ];
    const prototype = ServiceTenantDirectoryOperations.prototype;
    for (const [method, operation] of handlers) {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, method);
      if (descriptor !== undefined) {
        InternalHandler(operation)(prototype, method, descriptor);
      }
    }
    return ServiceTenantDirectoryOperations;
  }
}
