import { CallerWait } from './caller-wait.js';
import type { CallerWaitOptions } from './caller-wait.options.js';
import { CacheKeyTooLongError } from './errors/cache-key-too-long.error.js';
import { CacheGuard } from './errors/cache-guard.js';
import type { SingleFlightOptions } from './single-flight.options.js';

/**
 * Une las ejecuciones concurrentes que comparten una llave: mientras una está en
 * vuelo, las demás reciben su misma promesa en vez de repetir el trabajo.
 */
export class SingleFlight {
  /** Largo máximo por defecto de una llave, en caracteres. */
  static readonly DEFAULT_MAX_KEY_LENGTH = 1_024;

  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly maxKeyLength: number;

  constructor(
    private readonly wait: CallerWait,
    options: SingleFlightOptions = {},
  ) {
    this.maxKeyLength = CacheGuard.instance.positiveInteger(
      'maxKeyLength',
      options.maxKeyLength ?? SingleFlight.DEFAULT_MAX_KEY_LENGTH,
    );
  }

  /** Ejecuciones en curso. */
  get size(): number {
    return this.inFlight.size;
  }

  /**
   * Ejecuta `fn` salvo que ya haya una en curso con la misma llave, en cuyo caso
   * comparte su promesa. La llave se libera al terminar, con éxito o con error.
   *
   * `options` solo acota la espera de quien llama: si aborta o vence su plazo,
   * ese llamador rechaza mientras la ejecución compartida sigue para los demás.
   * Un llamador ya cancelado no arranca `fn`.
   * @throws CacheKeyTooLongError cuando la llave supera `maxKeyLength`.
   */
  run<T>(
    key: string,
    fn: () => Promise<T>,
    options: CallerWaitOptions = {},
  ): Promise<T> {
    if (key.length > this.maxKeyLength) {
      return Promise.reject(
        new CacheKeyTooLongError(key.length, this.maxKeyLength),
      );
    }
    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing !== undefined) {
      return this.wait.wait(existing, options);
    }
    const cancelled = this.wait.cancellation(options);
    if (cancelled !== undefined) {
      return Promise.reject(cancelled);
    }
    const promise = new Promise<T>((resolve) => resolve(fn()));
    this.inFlight.set(key, promise);
    const release = (): void => {
      if (this.inFlight.get(key) === promise) {
        this.inFlight.delete(key);
      }
    };
    promise.then(release, release);
    return this.wait.wait(promise, options);
  }
}
