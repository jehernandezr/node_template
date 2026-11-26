import { HttpLimits } from './http-limits.js';
import { HttpProblemError } from './http-problem.error.js';

/** Reads a JSON body with a size cap. Any failure comes out as a request error. */
export class JsonBodyReader {
  constructor(private readonly maxBytes: number = HttpLimits.MAX_BODY_BYTES) {}

  /**
   * An empty body is `undefined`. When the cap is exceeded it stops reading: Node discards the rest when
   * the response finishes.
   * @param chunks Body chunks.
   * @returns The parsed body.
   * @throws HttpProblemError (`PLATFORM.HTTP.PAYLOAD_TOO_LARGE` or `PLATFORM.HTTP.MALFORMED_BODY`).
   */
  async read(chunks: AsyncIterable<Uint8Array | string>): Promise<unknown> {
    const parts: Buffer[] = [];
    let total = 0;
    for await (const chunk of chunks) {
      const part =
        typeof chunk === 'string'
          ? Buffer.from(chunk, 'utf8')
          : Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      total += part.length;
      if (total > this.maxBytes) {
        throw HttpProblemError.payloadTooLarge();
      }
      parts.push(part);
    }
    if (total === 0) {
      return undefined;
    }
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(
        Buffer.concat(parts),
      );
      return JSON.parse(text);
    } catch {
      throw HttpProblemError.malformedBody();
    }
  }
}
