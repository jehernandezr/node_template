/** Petición que recibió un `FakeFetcher`, con sus cabeceras en minúscula. */
export interface RecordedRequest {
  readonly url: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body: unknown;
  readonly signal: AbortSignal | null | undefined;
}

/** `fetch` de prueba: registra cada petición y responde o falla según lo programado. */
export class FakeFetcher {
  readonly requests: RecordedRequest[] = [];
  private response: Response | undefined;
  private error: unknown;

  /** Respuesta que devuelve la siguiente llamada. */
  respondWith(response: Response): void {
    this.response = response;
    this.error = undefined;
  }

  /** Error que lanza la siguiente llamada, como un fallo de red. */
  failWith(error: unknown): void {
    this.error = error;
    this.response = undefined;
  }

  /** Flecha para que `this` quede enlazado al pasarla como `fetcher`. */
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
