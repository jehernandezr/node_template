import type { CallOutcome } from '@platform/primitives';
import type { CallMeta } from '../../../transport/call-meta.js';
import { Transport } from '../../../transport/transport.js';

/** Script step: produces the result of an attempt from its metadata. */
type ScriptedStep = (meta: CallMeta) => Promise<CallOutcome<unknown>>;

/**
 * Test transport with a script of steps in order. The last step repeats
 * when the script runs out. It counts the calls and stores their metadata.
 */
export class ScriptedTransport extends Transport {
  calls = 0;
  readonly metas: CallMeta[] = [];
  readonly inputs: unknown[] = [];
  private readonly steps: ScriptedStep[] = [];

  /** Makes the next attempt return `outcome`. */
  thenReturn(outcome: CallOutcome<unknown>): this {
    this.steps.push(() => Promise.resolve(outcome));
    return this;
  }

  /** Makes the next attempt fail with `error`. */
  thenThrow(error: unknown): this {
    this.steps.push(() => Promise.reject(error));
    return this;
  }

  /**
   * Makes the next attempt cancel `controller` and wait for its signal to abort;
   * this simulates a cancellation with the attempt in flight.
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
