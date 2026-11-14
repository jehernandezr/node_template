/** Métricas que publica observability. Cada librería declara las suyas. */
export enum PlatformMetric {
  /** Contador de errores por código `SERVICIO.SUBMÓDULO.ERROR`. */
  Errors = 'platform.errors',
}
