import type { Clock } from '@platform/kernel';
import { TimerScheduler } from '@platform/primitives';
import { ShardingError } from '../errors/sharding-error.js';
import { ShardingErrorCode } from '../errors/sharding-error-code.enum.js';
import type { TenantWriteGate } from '../ports/tenant-write-gate.js';
import type { TenantWriteWaiterOptions } from './tenant-write-waiter-options.js';

/** Hace esperar una escritura mientras la compuerta de su tenant está cerrada, con un tope. */
export class TenantWriteWaiter {
  private static readonly MS_PER_SECOND = 1_000;

  constructor(
    private readonly gate: TenantWriteGate,
    private readonly clock: Clock,
    private readonly options: TenantWriteWaiterOptions,
  ) {}

  /**
   * Vuelve en cuanto la compuerta está abierta.
   * @throws ShardingError `TenantMigrating`, con `retryAfterSeconds`, si sigue cerrada al vencer la espera.
   */
  async awaitOpen(tenantId: string): Promise<void> {
    const giveUpAt = this.clock.now().getTime() + this.options.maxWaitMs;
    while (await this.gate.isClosed(tenantId)) {
      const left = giveUpAt - this.clock.now().getTime();
      if (left <= 0) {
        throw new ShardingError(
          ShardingErrorCode.TenantMigrating,
          'Tenant is migrating; writes are blocked until the move completes',
          {
            details: {
              tenantId,
              retryAfterSeconds: Math.ceil(
                this.options.maxWaitMs / TenantWriteWaiter.MS_PER_SECOND,
              ),
            },
          },
        );
      }
      await TenantWriteWaiter.pause(Math.min(left, this.options.pollMs));
    }
  }

  private static pause(ms: number): Promise<void> {
    return new Promise((resolve) => {
      TimerScheduler.arm(ms, resolve);
    });
  }
}
