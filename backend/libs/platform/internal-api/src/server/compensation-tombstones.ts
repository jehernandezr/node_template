import { ClaimState } from '@platform/kernel';
import { CallOutcome, type Deadline } from '@platform/primitives';
import { CompensationKey } from '../contract/compensation-key.js';
import { IdempotencyKeyPolicy } from '../contract/idempotency-key-policy.js';
import { InternalApiReason } from '../contract/internal-api-reason.enum.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import type { CallMeta } from '../transport/call-meta.js';
import type { ProcessedOperationStore } from './processed-operation-store.js';

/**
 * Antes de correr una compensación de saga deja una lápida en la llave del paso que deshace. Si ese paso nunca llegó,
 * la lápida lo deja completado como compensado y un envío tardío ya no aplica su efecto, que nadie desharía. Si el
 * paso sigue en curso, la compensación espera: responde `in-progress` y la saga la repite cuando el paso terminó. Si
 * el paso ya terminó, la compensación corre como siempre.
 */
export class CompensationTombstones {
  constructor(private readonly store: ProcessedOperationStore) {}

  /**
   * Pone la lápida en la llave de cada operación de `forwards` que la compensación de `meta` deshace. Devuelve el
   * resultado con el que responder si la compensación tiene que esperar, o `undefined` si puede correr.
   */
  async lay(
    forwards: readonly string[],
    meta: CallMeta,
    deadline: Deadline,
  ): Promise<CallOutcome<never> | undefined> {
    const forwardKey = CompensationKey.forwardOf(meta.idempotencyKey);
    if (forwardKey === undefined) {
      return undefined;
    }
    for (const operationId of forwards) {
      const key = IdempotencyKeyPolicy.storeKey({
        tenantId: meta.tenantId,
        operationId,
        idempotencyKey: forwardKey,
      });
      if (!IdempotencyKeyPolicy.fitsStore(key)) {
        continue;
      }
      const claim = await this.store.claim(key, {
        fingerprint: CompensationKey.TOMBSTONE_FINGERPRINT,
        deadline,
        ...(meta.tenantId !== undefined && { tenantId: meta.tenantId }),
      });
      if (claim.state === ClaimState.InProgress) {
        return CallOutcome.transientFailure(InternalApiReason.InProgress);
      }
      if (claim.state === ClaimState.Acquired) {
        await this.store.complete(
          key,
          claim.claimToken,
          CallOutcome.businessError(InternalApiErrorCode.StepCompensated),
        );
      }
    }
    return undefined;
  }
}
