import type { CallOutcome } from '@platform/primitives';
import type { CallMeta } from '../../../transport/call-meta.js';
import { Transport } from '../../../transport/transport.js';

/** Paso del guion: produce el resultado de un intento a partir de sus metadatos. */
type ScriptedStep = (meta: CallMeta) => Promise<CallOutcome<unknown>>;

/**
 * Transporte de prueba con un guion de pasos en orden. El último paso se repite
 * cuando el guion se agota. Cuenta las llamadas y guarda sus metadatos.
 */
export class ScriptedTransport extends Transport {
  calls = 0;
  readonly metas: CallMeta[] = [];
  readonly inputs: unknown[] = [];
  private readonly steps: ScriptedStep[] = [];

  /** El siguiente intento devuelve `outcome`. */
  thenReturn(outcome: CallOutcome<unknown>): this {
    this.steps.push(() => Promise.resolve(outcome));
    return this;
  }

  /** El siguiente intento falla con `error`. */
  thenThrow(error: unknown): this {
    this.steps.push(() => Promise.reject(error));
    return this;
  }

  /**
   * El siguiente intento cancela `controller` y espera a que su señal se aborte;
   * así se simula una cancelación con el intento en vuelo.
   */
  thenAbort(controller: AbortController): this {
    this.steps.push((meta) => {
      controller.abort();
      return new Promise((_resolve, reject) => {
        const signal = meta.signal;
        if (signal === undefined || signal.aborted) {
          reject(signal?.reason);
          return;
        }
        signal.addEventListener('abort', () => reject(signal.reason), {
          once: true,
        });
      });
    });
    return this;
  }

  invoke(
    _operationId: string,
    input: unknown,
    meta: CallMeta,
  ): Promise<CallOutcome<unknown>> {
    this.calls += 1;
    this.metas.push(meta);
    this.inputs.push(input);
    const index = Math.min(this.calls, this.steps.length) - 1;
    const step = this.steps[index];
    if (step === undefined) {
      return Promise.reject(new Error('ScriptedTransport has no steps'));
    }
    return step(meta);
  }
}
