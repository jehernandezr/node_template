import type { HttpTestRequest } from './http-test-request.js';
import type { HttpTestResponse } from './http-test-response.js';

/** Cliente de pruebas sobre `fetch` nativo: sin supertest, contra una app que escucha en un puerto libre. */
export class HttpTestClient {
  constructor(
    private readonly baseUrl: string,
    private readonly defaultHeaders: Readonly<Record<string, string>> = {},
  ) {}

  /** Otro cliente con headers fijos adicionales (`Authorization`, `Origin`, `Cookie`). */
  withHeaders(headers: Readonly<Record<string, string>>): HttpTestClient {
    return new HttpTestClient(this.baseUrl, {
      ...this.defaultHeaders,
      ...headers,
    });
  }

  get(path: string, request: HttpTestRequest = {}): Promise<HttpTestResponse> {
    return this.send('GET', path, request);
  }

  post(path: string, request: HttpTestRequest = {}): Promise<HttpTestResponse> {
    return this.send('POST', path, request);
  }

  put(path: string, request: HttpTestRequest = {}): Promise<HttpTestResponse> {
    return this.send('PUT', path, request);
  }

  patch(
    path: string,
    request: HttpTestRequest = {},
  ): Promise<HttpTestResponse> {
    return this.send('PATCH', path, request);
  }

  delete(
    path: string,
    request: HttpTestRequest = {},
  ): Promise<HttpTestResponse> {
    return this.send('DELETE', path, request);
  }

  async send(
    method: string,
    path: string,
    request: HttpTestRequest = {},
  ): Promise<HttpTestResponse> {
    const headers: Record<string, string> = { ...this.defaultHeaders };
    let body: string | undefined;
    if (request.rawBody !== undefined) {
      body = request.rawBody;
    } else if (request.body !== undefined) {
      body = JSON.stringify(request.body);
      headers['content-type'] = 'application/json';
    }
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { ...headers, ...request.headers },
      ...(body === undefined ? {} : { body }),
      redirect: 'manual',
    });
    const text = await response.text();
    return {
      status: response.status,
      headers: response.headers,
      body: text === '' ? undefined : HttpTestClient.parse(text),
      text,
    };
  }

  private static parse(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  }
}
