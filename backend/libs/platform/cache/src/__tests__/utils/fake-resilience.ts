import { FixedClock } from '@platform/kernel/test-utils';
import type {
  PolicyName,
  ResilienceCallOptions,
  ResilientOperation,
} from '@platform/resilience';
import { Deadline } from '@platform/primitives';
import type { CacheResilience } from '../../cache-aside.options.js';

/**
 * Resiliencia de prueba: ejecuta la operación sin reintentos ni circuito y
 * anota el nombre de la política y la llave de dependencia de cada llamada.
 */
export class FakeResilience implements CacheResilience {
  readonly names: string[] = [];
  readonly dependencyKeys: (string | undefined)[] = [];
  private failure: Error | undefined;

  /** Hace que `execute` rechace sin llegar a ejecutar la operación. */
  failWith(error: Error): void {
    this.failure = error;
  }

  async execute<T>(
    name: PolicyName,
    fn: ResilientOperation<T>,
    options: ResilienceCallOptions = {},
  ): Promise<T> {
    this.names.push(name.value);
    this.dependencyKeys.push(options.dependencyKey);
    if (this.failure !== undefined) {
      throw this.failure;
    }
    return fn(new AbortController().signal, {
      number: 1,
      deadline: Deadline.after(60_000, new FixedClock()),
    });
  }
}
