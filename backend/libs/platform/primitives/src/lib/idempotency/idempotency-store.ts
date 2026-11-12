import type { Deadline } from '../deadline.js';
import { InvalidArgumentError } from '../errors.js';

/** Estado de una llave de idempotencia al pedir el claim. */
export enum ClaimState {
  /** Este intento es dueño de la llave hasta `leaseUntil` y debe completarla o liberarla. */
  Acquired = 'acquired',
  /** Otro intento es dueño y su lease sigue vigente. */
  InProgress = 'in-progress',
  /** La operación ya terminó; se devuelve el resultado guardado. */
  Completed = 'completed',
}

export interface AcquiredClaim {
  readonly state: ClaimState.Acquired;
  /** Token de fencing. `complete` y `release` solo lo aceptan mientras sea el vigente. */
  readonly claimToken: string;
  /** Milisegundos epoch hasta los que nadie más puede tomar la llave. */
  readonly leaseUntil: number;
  /** Huella guardada con el primer claim; se compara con la de este intento. */
  readonly fingerprint: string;
  /** `true` si se tomó la llave porque el lease anterior venció. */
  readonly takeover: boolean;
}

export interface InProgressClaim {
  readonly state: ClaimState.InProgress;
  readonly leaseUntil: number;
  readonly fingerprint: string;
}

export interface CompletedClaim<R> {
  readonly state: ClaimState.Completed;
  readonly result: R;
  readonly fingerprint: string;
}

/** Resultado de `IdempotencyStore.claim`. */
export type ClaimResult<R> =
  AcquiredClaim | InProgressClaim | CompletedClaim<R>;

export interface ClaimRequest {
  /**
   * Huella de la entrada, por ejemplo `stableDigest(input)`. Se guarda con el
   * primer claim; si un intento posterior trae otra, quien llama la rechaza.
   */
  readonly fingerprint: string;
  /** Límite de la operación. El lease dura hasta el límite más `leaseMarginMs`. */
  readonly deadline: Deadline;
  /** Margen sobre el límite. Por defecto `DEFAULT_LEASE_MARGIN_MS`. */
  readonly leaseMarginMs?: number;
  /**
   * Duración mínima del lease desde ahora. Messaging lo usa para que el lease
   * nunca sea menor que el visibility timeout de la cola.
   */
  readonly minLeaseMs?: number;
}

/**
 * Puerto de idempotencia de tres estados con fencing.
 * - `claim` es atómico por llave. Un lease vencido lo puede tomar otro intento,
 *   que recibe un token nuevo e invalida el anterior.
 * - `complete` guarda el resultado final y solo lo acepta del token vigente.
 *   En producción se escribe en la misma unidad de trabajo que los efectos.
 * - `release` borra un claim en curso (para permitir otro intento) y también
 *   exige el token vigente.
 * `complete` y `release` rechazan un token viejo con `StaleClaimError`.
 */
export interface IdempotencyStore<R = unknown> {
  claim(key: string, request: ClaimRequest): Promise<ClaimResult<R>>;
  complete(key: string, claimToken: string, result: R): Promise<void>;
  release(key: string, claimToken: string): Promise<void>;
}

/** Margen por defecto entre el límite de la operación y el fin del lease. */
export const DEFAULT_LEASE_MARGIN_MS = 5_000;

/** Longitud máxima de una llave de idempotencia. */
export const MAX_IDEMPOTENCY_KEY_LENGTH = 512;

/** Longitud máxima de una huella. */
export const MAX_FINGERPRINT_LENGTH = 256;

function assertNonNegativeFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new InvalidArgumentError(name, 'a finite number >= 0');
  }
}

/**
 * Fin del lease en milisegundos epoch: el límite más el margen, y al menos
 * `minLeaseMs` desde `nowMs`. Así el lease siempre cubre la operación completa.
 */
export function computeLeaseUntil(
  request: Pick<ClaimRequest, 'deadline' | 'leaseMarginMs' | 'minLeaseMs'>,
  nowMs: number,
): number {
  const margin = request.leaseMarginMs ?? DEFAULT_LEASE_MARGIN_MS;
  const minimum = request.minLeaseMs ?? 0;
  assertNonNegativeFinite('leaseMarginMs', margin);
  assertNonNegativeFinite('minLeaseMs', minimum);
  return Math.max(request.deadline.atMs + margin, nowMs + minimum);
}

/** Valida la llave y la huella. Los adaptadores lo llaman antes de tocar el almacenamiento. */
export function assertClaimInput(key: string, fingerprint: string): void {
  if (
    typeof key !== 'string' ||
    key.length === 0 ||
    key.length > MAX_IDEMPOTENCY_KEY_LENGTH
  ) {
    throw new InvalidArgumentError(
      'key',
      `a string of 1 to ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`,
    );
  }
  if (
    typeof fingerprint !== 'string' ||
    fingerprint.length === 0 ||
    fingerprint.length > MAX_FINGERPRINT_LENGTH
  ) {
    throw new InvalidArgumentError(
      'fingerprint',
      `a string of 1 to ${MAX_FINGERPRINT_LENGTH} characters`,
    );
  }
}
