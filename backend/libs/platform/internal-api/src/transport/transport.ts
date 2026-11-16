import type { CallOutcome } from '@platform/primitives';
import type { CallMeta } from './call-meta.js';

/**
 * Puerto que lleva una llamada al servidor. La entrada se transmite sin
 * cambios. Un transporte hace un solo intento: los reintentos son del
 * `InternalClient`, que los ejecuta con el `ResilienceRegistry`.
 */
export abstract class Transport {
  abstract invoke(
    operationId: string,
    input: unknown,
    meta: CallMeta,
  ): Promise<CallOutcome<unknown>>;
}
