import type { CallOutcome } from '@platform/primitives';
import type { CallMeta } from './call-meta.js';

/**
 * Port that carries a call to the server. The input is transmitted
 * unchanged. A transport makes a single attempt: retries belong to the
 * `InternalClient`, which runs them with the `ResilienceRegistry`.
 */
export abstract class Transport {
  abstract invoke(
    operationId: string,
    input: unknown,
    meta: CallMeta,
  ): Promise<CallOutcome<unknown>>;
}
