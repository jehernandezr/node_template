import type { CallOutcome, FinalOutcome } from '@platform/primitives';
import { UnitStage } from './unit-stage.enum.js';

/**
 * Lo que el `UnitOfWorkRunner` necesita saber al recuperarse de un fallo: hasta
 * dónde llegó la unidad de trabajo y qué resultado ya se decidió. Vive fuera de
 * la transacción porque el rollback deshace los efectos, no este registro.
 */
export class UnitProgress {
  stage: UnitStage = UnitStage.Begin;
  /** Resultado que no se guarda (transitorio, incierto o violación): la unidad se deshace. */
  rejected?: CallOutcome<unknown>;
  /** El handler lanzó: el error se clasifica al recuperarse. */
  thrown?: { readonly error: unknown };
  /** El handler pidió deshacer su unidad con un resultado final: se guarda aparte. */
  rolledBack?: FinalOutcome<unknown>;
}
