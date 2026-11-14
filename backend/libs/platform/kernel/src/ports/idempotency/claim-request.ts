/** Límite de una operación. `Deadline` de `@platform/primitives` lo cumple. */
export interface ClaimDeadline {
  /** Instante límite en milisegundos epoch. */
  readonly atMs: number;
}

export interface ClaimRequest {
  /**
   * Huella de la entrada, por ejemplo `CanonicalJson.digest(input)`. Se guarda
   * con el primer claim; si un intento posterior trae otra, quien llama la rechaza.
   */
  readonly fingerprint: string;
  /** Límite de la operación. El lease dura hasta el límite más `leaseMarginMs`. */
  readonly deadline: ClaimDeadline;
  /** Margen sobre el límite. Por defecto 5 000 ms. */
  readonly leaseMarginMs?: number;
  /**
   * Duración mínima del lease desde ahora. Messaging lo usa para que el lease
   * nunca sea menor que el visibility timeout de la cola.
   */
  readonly minLeaseMs?: number;
}
