import { IdempotencyStore } from '@platform/kernel';
import type { FinalOutcome } from '@platform/primitives';

/**
 * Almacén de idempotencia del router: el puerto de tres estados con fencing,
 * que guarda resultados finales (éxito o error de negocio declarado). Un
 * almacén de producción escribe `complete` en la misma unidad de trabajo que
 * los efectos del handler, así un resultado queda guardado si y solo si sus
 * efectos se confirmaron. Es el token de inyección del módulo.
 */
export abstract class ProcessedOperationStore extends IdempotencyStore<
  FinalOutcome<unknown>
> {
  /**
   * Extiende hasta `leaseUntilMs` el lease de un claim en curso que sigue siendo de `claimToken`, sin acortarlo. Lo
   * llama el servidor mientras el handler corre, así otro intento solo toma la llave si el proceso dueño dejó de
   * renovarla. Devuelve `false` si el claim ya terminó o lo tomó otro intento.
   */
  abstract renew(
    key: string,
    claimToken: string,
    leaseUntilMs: number,
  ): Promise<boolean>;
}
