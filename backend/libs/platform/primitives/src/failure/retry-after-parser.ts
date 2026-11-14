import type { Clock } from '@platform/kernel';
import { PrimitivesGuard } from '../errors/primitives-guard.js';

/** Interpreta la espera que sugiere un servidor en `Retry-After`. */
export class RetryAfterParser {
  /** Tope por defecto de la espera sugerida. */
  static readonly DEFAULT_MAX_MS = 60_000;

  /** Longitud máxima de un encabezado que se intenta interpretar. */
  private static readonly MAX_LENGTH = 64;

  private static readonly DELAY_SECONDS = /^\d{1,10}$/;

  constructor(
    private readonly clock: Clock,
    readonly maxMs: number = RetryAfterParser.DEFAULT_MAX_MS,
  ) {
    PrimitivesGuard.instance.nonNegativeFinite('maxMs', maxMs);
  }

  /**
   * Espera sugerida en milisegundos, acotada a `[0, maxMs]`. Acepta el
   * encabezado (segundos enteros o fecha HTTP), segundos como número o una fecha.
   * @returns `undefined` si el valor falta o no se puede interpretar.
   */
  parse(value: string | number | Date | null | undefined): number | undefined {
    const delay = this.rawDelayMs(value);
    if (delay === undefined || Number.isNaN(delay)) {
      return undefined;
    }
    return Math.min(this.maxMs, Math.max(0, Math.ceil(delay)));
  }

  private rawDelayMs(
    value: string | number | Date | null | undefined,
  ): number | undefined {
    const nowMs = this.clock.now().getTime();
    if (typeof value === 'number') {
      return Number.isFinite(value) && value >= 0 ? value * 1000 : undefined;
    }
    if (value instanceof Date) {
      return value.getTime() - nowMs;
    }
    if (
      typeof value !== 'string' ||
      value.length > RetryAfterParser.MAX_LENGTH
    ) {
      return undefined;
    }
    const trimmed = value.trim();
    if (RetryAfterParser.DELAY_SECONDS.test(trimmed)) {
      return Number(trimmed) * 1000;
    }
    // Solo una fecha HTTP con nombre de día (IMF-fixdate, RFC 850 o asctime);
    // evita que Date.parse acepte números sueltos u otros formatos ambiguos.
    if (!/^[A-Za-z]{3}/.test(trimmed)) {
      return undefined;
    }
    const at = Date.parse(trimmed);
    return Number.isNaN(at) ? undefined : at - nowMs;
  }
}
