/** Lo que se firma de una llamada: método, ruta, cuerpo y las cabeceras del protocolo. */
export interface SignableRequest {
  /** Método HTTP en mayúscula. */
  readonly method: string;
  /** Ruta sin consulta, como `InternalApiRoute.pathOf`. */
  readonly path: string;
  /** Cuerpo ya interpretado: la firma cubre su JSON canónico, no los bytes enviados. */
  readonly body: unknown;
  /** Cabeceras con el nombre en minúscula. */
  readonly headers: Readonly<Record<string, string | undefined>>;
}
