/** Lo que trae la petición de una conexión de tiempo real para autenticarla. */
export interface StreamCredentials {
  /** Cabecera `Authorization` o, en Socket.IO, `Bearer <token>` armado con el `auth.token` del handshake. */
  readonly authorization?: string;
  /** Cabecera `Cookie` tal como llega. */
  readonly cookie?: string;
}
