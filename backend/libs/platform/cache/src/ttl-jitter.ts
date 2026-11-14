import type { RandomSource } from '@platform/kernel';
import { CacheInvalidArgumentError } from './errors/cache-invalid-argument.error.js';
import { CacheGuard } from './errors/cache-guard.js';

/**
 * Reparte los vencimientos al azar alrededor de su base, para que muchas
 * entradas creadas a la vez no caduquen en el mismo instante.
 */
export class TtlJitter {
  /** Desviación relativa por defecto (10 %). */
  static readonly DEFAULT_RATIO = 0.1;

  constructor(private readonly random: RandomSource) {}

  /**
   * TTL entero en milisegundos dentro de `[base * (1 - ratio), base * (1 + ratio)]`.
   * @throws CacheInvalidArgumentError cuando `baseMs` o `ratio` están fuera de rango.
   */
  jitter(baseMs: number, ratio: number = TtlJitter.DEFAULT_RATIO): number {
    CacheGuard.instance.nonNegativeFinite('baseMs', baseMs);
    if (!(ratio >= 0 && ratio <= 1)) {
      throw new CacheInvalidArgumentError('ratio', 'a number between 0 and 1');
    }
    const low = Math.ceil(baseMs * (1 - ratio));
    const high = Math.floor(baseMs * (1 + ratio));
    if (low > high) {
      return Math.round(baseMs);
    }
    const span = high - low;
    // Una fuente fuera de [0, 1) o NaN no debe sacar el TTL de sus límites.
    const sample = this.random.next();
    const bounded = Number.isFinite(sample) && sample > 0 ? sample : 0;
    const offset = Math.min(Math.floor(bounded * (span + 1)), span);
    return low + offset;
  }
}
