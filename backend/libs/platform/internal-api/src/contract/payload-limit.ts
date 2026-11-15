/** Tope del tamaño serializado de una entrada o una salida. */
export class PayloadLimit {
  /** Tope por defecto, en bytes. */
  static readonly DEFAULT_MAX_BYTES = 256 * 1024;

  constructor(readonly maxBytes: number = PayloadLimit.DEFAULT_MAX_BYTES) {}

  /**
   * Tamaño en bytes del texto JSON de `value`, o `undefined` si no se puede
   * serializar (ciclos, bigint). `undefined` cuenta como cero bytes.
   */
  static byteLength(value: unknown): number | undefined {
    try {
      const text = JSON.stringify(value);
      return text === undefined ? 0 : Buffer.byteLength(text, 'utf8');
    } catch {
      return undefined;
    }
  }

  /** Indica si `value` se serializa dentro del tope. */
  fits(value: unknown): boolean {
    const size = PayloadLimit.byteLength(value);
    return size !== undefined && size <= this.maxBytes;
  }
}
