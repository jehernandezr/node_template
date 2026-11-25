/** Values the test authenticator writes in CBOR: just enough for WebAuthn. */
export type CborValue =
  number | string | Buffer | ReadonlyMap<CborValue, CborValue>;

/** Minimal CBOR encoder (RFC 8949) to build `attestationObject` and COSE keys in the tests. */
export class CborWriter {
  static write(value: CborValue): Buffer {
    if (typeof value === 'number') {
      return value >= 0
        ? CborWriter.head(0, value)
        : CborWriter.head(1, -1 - value);
    }
    if (typeof value === 'string') {
      const bytes = Buffer.from(value, 'utf8');
      return Buffer.concat([CborWriter.head(3, bytes.length), bytes]);
    }
    if (Buffer.isBuffer(value)) {
      return Buffer.concat([CborWriter.head(2, value.length), value]);
    }
    const parts: Buffer[] = [CborWriter.head(5, value.size)];
    for (const [key, item] of value) {
      parts.push(CborWriter.write(key), CborWriter.write(item));
    }
    return Buffer.concat(parts);
  }

  private static head(major: number, length: number): Buffer {
    const type = major << 5;
    if (length < 24) {
      return Buffer.from([type | length]);
    }
    if (length < 0x100) {
      return Buffer.from([type | 24, length]);
    }
    const buffer = Buffer.alloc(3);
    buffer.writeUInt8(type | 25, 0);
    buffer.writeUInt16BE(length, 1);
    return buffer;
  }
}
