import { createHash, createHmac, type Hash, type Hmac } from 'node:crypto';

/** Data that `@smithy/signature-v4` passes to the hash. */
export type SourceData = string | ArrayBuffer | ArrayBufferView;

/**
 * SHA-256 (or HMAC-SHA-256 if it receives a secret) with the shape
 * `@smithy/signature-v4` requires. Uses `node:crypto`, so no other package is added.
 */
export class NodeSha256 {
  private digester: Hash | Hmac;

  constructor(private readonly secret?: SourceData) {
    this.digester = this.create();
  }

  update(data: SourceData): void {
    this.digester.update(
      typeof data === 'string'
        ? data
        : new Uint8Array(
            ArrayBuffer.isView(data)
              ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
              : data,
          ),
    );
  }

  digest(): Promise<Uint8Array> {
    return Promise.resolve(new Uint8Array(this.digester.digest()));
  }

  reset(): void {
    this.digester = this.create();
  }

  private create(): Hash | Hmac {
    return this.secret === undefined
      ? createHash('sha256')
      : createHmac('sha256', NodeSha256.toBuffer(this.secret));
  }

  private static toBuffer(secret: SourceData): Buffer {
    if (typeof secret === 'string') {
      return Buffer.from(secret);
    }
    return ArrayBuffer.isView(secret)
      ? Buffer.from(secret.buffer, secret.byteOffset, secret.byteLength)
      : Buffer.from(secret);
  }
}
