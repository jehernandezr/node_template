/** Requisito de acceso de una ruta. */
export enum AccessKind {
  /** Sin sesión, por ejemplo el inicio de sesión. */
  Public = 'public',
  /** Requiere un access token válido. */
  Authenticated = 'authenticated',
}
