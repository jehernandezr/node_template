import type { RequestContextHttpResponse } from '../../request-context.http.js';

/** Respuesta HTTP que guarda los headers escritos, para pruebas. */
export class RecordingResponse implements RequestContextHttpResponse {
  readonly headers = new Map<string, string>();

  setHeader(name: string, value: string): this {
    this.headers.set(name, value);
    return this;
  }
}
