/** Lo que se firma de una llamada: método, ruta, cuerpo y las cabeceras del protocolo. */
export interface SignableRequest {
  /** Método HTTP en mayúscula. */
  readonly method: string;
  /** Ruta sin consulta, como `InternalApiRoute.pathOf`. */
  readonly path: string;
  /** Cuerpo ya interpretado: la firma cubre su JSON canónico, no los bytes enviados. */
  readonly body: unknown;
  /**
   * URL base del servicio destino (`ServiceBaseUrls`), sin la ruta. Los firmadores que atan la firma
   * al destino, como SigV4, la necesitan; el HMAC la ignora.
   */
  readonly baseUrl?: string;
  /** Cabeceras con el nombre en minúscula. */
  readonly headers: Readonly<Record<string, string | undefined>>;
}
