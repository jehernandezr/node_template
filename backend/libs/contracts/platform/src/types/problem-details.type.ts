/**
 * Detalle de un campo inválido o de un error parcial.
 * `field` es la ruta del campo con segmentos separados por punto, por ejemplo `items.0.name`.
 */
export interface FieldError {
  field?: string;
  code: string;
  message?: string;
}

/** Nombre anterior de `FieldError`. */
export type ProblemFieldError = FieldError;

/**
 * Respuesta de error RFC 9457 (Problem Details) con extensiones de la plataforma.
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code: string;
  traceId?: string;
  errors?: FieldError[];
  /** Datos que el código del error declara públicos, por ejemplo la URL de la región del tenant. */
  details?: ProblemDetailsDetails;
}

/** Datos públicos de un error, cada uno con la clave de `ProblemDetailKey`. */
export interface ProblemDetailsDetails {
  /** URL de la API de la región donde vive el tenant. */
  apiBaseUrl?: string;
  region?: string;
}
