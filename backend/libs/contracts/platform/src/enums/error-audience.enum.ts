/**
 * Quién puede ver un código de error.
 * `public`: viaja al cliente en un Problem Details y tiene mensaje en el ARB del front.
 * `internal`: solo entre procesos del backend; hacia el cliente se responde `PLATFORM.INTERNAL.UNEXPECTED`.
 */
export enum ErrorAudience {
  Public = 'public',
  Internal = 'internal',
}
