import { CallOutcome, type CallOutcome as Outcome } from '@platform/primitives';
import { OperationResolver } from '../../../contract/operation-resolver.js';
import { InternalRouter } from '../../../server/internal-router.js';
import type { CallMeta } from '../../../transport/call-meta.js';

/** Llamada que recibió el router de prueba. */
export interface RouterCall {
  readonly operationId: string;
  readonly input: unknown;
  readonly meta: CallMeta;
}

/** Router de prueba que registra las llamadas y responde lo programado. */
export class StubInternalRouter extends InternalRouter {
  readonly calls: RouterCall[] = [];
  private result: Outcome<unknown> = CallOutcome.success(null);

  constructor() {
    // El constructor del router solo guarda sus dependencias, que este doble no usa.
    super(
      new OperationResolver(),
      undefined as never,
      undefined as never,
      undefined as never,
    );
  }

  /** Resultado que devuelve la siguiente llamada. */
  respondWith(outcome: Outcome<unknown>): void {
    this.result = outcome;
  }

  override handle(
    operationId: string,
    rawInput: unknown,
    meta: CallMeta,
  ): Promise<Outcome<unknown>> {
    this.calls.push({ operationId, input: rawInput, meta });
    return Promise.resolve(this.result);
  }
}
