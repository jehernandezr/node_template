/**
 * Clase de una falla, compartida por resilience, messaging, internal-api y saga.
 * - `Transient`: reintentar la misma llamada puede funcionar.
 * - `Permanent`: repetirla da el mismo resultado (regla de negocio, 4xx, recurso inexistente).
 * - `ProtocolViolation`: contrato roto o fallo de implementación. Nunca se reintenta.
 * - `Timeout`: se agotó el tiempo; el efecto pudo o no aplicarse.
 * - `Cancelled`: el llamador abortó; el efecto pudo o no aplicarse.
 */
export enum FailureKind {
  Transient = 'transient',
  Permanent = 'permanent',
  ProtocolViolation = 'protocol-violation',
  Timeout = 'timeout',
  Cancelled = 'cancelled',
}
