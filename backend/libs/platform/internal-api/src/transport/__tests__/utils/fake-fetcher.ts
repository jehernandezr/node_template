/** Request received by a `FakeFetcher`, with its headers in lowercase. */
export interface RecordedRequest {
  readonly url: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body: unknown;
  readonly signal: AbortSignal | null | undefined;
}

/** Test `fetch`: records each request and responds or fails as programmed. */
export class FakeFetcher {
  readonly requests: RecordedRequest[] = [];
  private response: Response | undefined;
  private error: unknown;

  /** Sets the response the next call returns. */
  respondWith(response: Response): void {
    this.response = response;
    this.error = undefined;
  }

  /** Sets the error the next call throws, like a network failure. */
  failWith(error: unknown): void {
    this.error = error;
    this.response = undefined;
  }

  /** Arrow function so `this` stays bound when passed as `fetcher`. */
  readonly fetch: typeof fetch = async (input, init) => {
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((value, name) => {
      headers[name] = value;
    });
    this.requests.push({
      url: String(input),
      method: String(init?.method),
      headers,
      body: JSON.parse(String(init?.body)),
      signal: init?.signal,
    });
    if (this.error !== undefined) {
      throw this.error;
    }
    if (this.response === undefined) {
      throw new Error('FakeFetcher has no scripted response');
    }
    return this.response;
  };
}
