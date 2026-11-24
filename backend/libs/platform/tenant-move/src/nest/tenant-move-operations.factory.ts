import type {
  TenantMoveAck,
  TenantMoveOperations,
  TenantMoveProgress,
  TenantMoveRef,
  TenantMoveVerification,
} from '@contracts/platform';
import type { HandlerResult } from '@platform/internal-api';
import { InternalHandler } from '@platform/internal-api/nest';
import { CallOutcome } from '@platform/primitives';
import type { TenantMoves } from '../application/tenant-moves.js';

/** Handlers de las cinco operaciones de traslado de un servicio. */
export interface TenantMoveInternalOperations {
  sync(input: TenantMoveRef): Promise<HandlerResult<TenantMoveProgress>>;
  finalize(
    input: TenantMoveRef,
  ): Promise<HandlerResult<TenantMoveVerification>>;
  abort(input: TenantMoveRef): Promise<HandlerResult<TenantMoveAck>>;
  switch(input: TenantMoveRef): Promise<HandlerResult<TenantMoveAck>>;
  cleanup(input: TenantMoveRef): Promise<HandlerResult<TenantMoveAck>>;
}

/**
 * Arma la clase de handlers de las operaciones de un servicio. Cada servicio tiene sus propios ids de operación,
 * así que la clase se crea por servicio y sus métodos se marcan con `@InternalHandler` de esas operaciones.
 */
export class TenantMoveOperationsFactory {
  static create(
    operations: TenantMoveOperations,
  ): new (moves: TenantMoves) => TenantMoveInternalOperations {
    class ServiceTenantMoveOperations implements TenantMoveInternalOperations {
      constructor(private readonly moves: TenantMoves) {}

      async sync(input: TenantMoveRef) {
        return { outcome: CallOutcome.success(await this.moves.sync(input)) };
      }

      async finalize(input: TenantMoveRef) {
        return {
          outcome: CallOutcome.success(await this.moves.finalize(input)),
        };
      }

      async abort(input: TenantMoveRef) {
        return { outcome: CallOutcome.success(await this.moves.abort(input)) };
      }

      async switch(input: TenantMoveRef) {
        return { outcome: CallOutcome.success(await this.moves.switch(input)) };
      }

      async cleanup(input: TenantMoveRef) {
        return {
          outcome: CallOutcome.success(await this.moves.cleanup(input)),
        };
      }
    }
    const handlers: readonly (readonly [
      keyof TenantMoveInternalOperations,
      TenantMoveOperations[keyof TenantMoveOperations],
    ])[] = [
      ['sync', operations.tenantMoveSync],
      ['finalize', operations.tenantMoveFinalize],
      ['abort', operations.tenantMoveAbort],
      ['switch', operations.tenantMoveSwitch],
      ['cleanup', operations.tenantMoveCleanup],
    ];
    const prototype = ServiceTenantMoveOperations.prototype;
    for (const [method, operation] of handlers) {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, method);
      if (descriptor !== undefined) {
        InternalHandler(operation)(prototype, method, descriptor);
      }
    }
    return ServiceTenantMoveOperations;
  }
}
