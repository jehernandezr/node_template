/** Cap on the serialized size of an input or an output. */
export class PayloadLimit {
  /** Default cap, in bytes. */
  static readonly DEFAULT_MAX_BYTES = 256 * 1024;

  constructor(readonly maxBytes: number = PayloadLimit.DEFAULT_MAX_BYTES) {}

  /**
   * Returns the size in bytes of the JSON text of `value`, or `undefined` if it cannot be
   * serialized (cycles, bigint). `undefined` counts as zero bytes.
   * @param value Value to measure.
   * @returns The size, or `undefined`.
   */
  static byteLength(value: unknown): number | undefined {
    try {
      const text = JSON.stringify(value);
      return text === undefined ? 0 : Buffer.byteLength(text, 'utf8');
    } catch {
      return undefined;
    }
  }

  /**
   * Whether `value` serializes within the cap.
   * @param value Value to check.
   * @returns `true` when it fits.
   */
  fits(value: unknown): boolean {
    const size = PayloadLimit.byteLength(value);
    return size !== undefined && size <= this.maxBytes;
  }
}
