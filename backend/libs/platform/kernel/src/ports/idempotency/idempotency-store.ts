import type { ClaimRequest } from './claim-request.js';
import type { ClaimResult } from './claim-result.js';

/**
 * Puerto de idempotencia de tres estados con fencing.
 * - `claim` es atómico por llave. Un lease vencido lo puede tomar otro intento,
 *   que recibe un token nuevo e invalida el anterior.
 * - `complete` guarda el resultado final y solo lo acepta del token vigente.
 *   En producción se escribe en la misma unidad de trabajo que los efectos.
 * - `release` borra un claim en curso (para permitir otro intento) y también
 *   exige el token vigente.
 * `complete` y `release` rechazan un token viejo con un error de claim vencido.
 */
export abstract class IdempotencyStore<R = unknown> {
  abstract claim(key: string, request: ClaimRequest): Promise<ClaimResult<R>>;

  abstract complete(key: string, claimToken: string, result: R): Promise<void>;

  abstract release(key: string, claimToken: string): Promise<void>;
}
