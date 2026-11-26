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

/** Handlers of the two tenant directory operations of a service. */
export interface TenantDirectoryInternalOperations {
  place(
    input: TenantDirectoryEntry,
  ): Promise<HandlerResult<TenantDirectoryAck>>;
  remove(input: TenantDirectoryRef): Promise<HandlerResult<TenantDirectoryAck>>;
}

/**
 * Builds the handler class for a service's operations. Each service has its own operation ids,
 * so the class is created per service and its methods are marked with `@InternalHandler` for those operations.
 */
export class TenantDirectoryOperationsFactory {
  /**
   * Builds the class that handles the service's directory operations.
   * @param operations Contracts of the directory operations.
   * @returns The handler class.
   */
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
