/**
 * Evento de una API HTTP de API Gateway con formato de carga 2.0 (el que usa
 * `api-routes` para las funciones). Solo los campos que lee el adaptador; se
 * declara aquí para no depender de `@types/aws-lambda`.
 */
export interface ApiGatewayHttpEvent {
  readonly version: string;
  /** Ruta tal como llegó, sin la consulta y con el escape original. */
  readonly rawPath: string;
  /** Consulta sin el `?` inicial; vacía si no hay. */
  readonly rawQueryString: string;
  /** Cabeceras con el nombre en minúscula; los valores repetidos van unidos con coma. */
  readonly headers?: Readonly<Record<string, string | undefined>>;
  /** Cookies de la petición, una por elemento (`nombre=valor`). */
  readonly cookies?: readonly string[];
  readonly requestContext: {
    readonly requestId?: string;
    readonly http: {
      readonly method: string;
      readonly sourceIp?: string;
    };
  };
  readonly body?: string;
  readonly isBase64Encoded?: boolean;
}
