/** Respuesta de una función detrás de una API HTTP de API Gateway con formato de carga 2.0. */
export interface ApiGatewayHttpResponse {
  readonly statusCode: number;
  /** Cabeceras sin `set-cookie`: van en `cookies`. */
  readonly headers: Readonly<Record<string, string>>;
  /** Una entrada `set-cookie` por elemento. */
  readonly cookies: readonly string[];
  readonly body: string;
  readonly isBase64Encoded: boolean;
}
