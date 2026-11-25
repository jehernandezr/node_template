import type { RequestContextHttpResponse } from '../../request-context.http.js';

/** HTTP response that stores the written headers, for tests. */
export class RecordingResponse implements RequestContextHttpResponse {
  readonly headers = new Map<string, string>();

  setHeader(name: string, value: string): this {
    this.headers.set(name, value);
    return this;
  }
}
