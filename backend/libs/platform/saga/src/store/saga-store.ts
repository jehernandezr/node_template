import type { SagaInstance } from '../model/saga-instance.js';
import type { StepLogEntry } from '../model/step-log-entry.js';
import type { DispatchWrite } from './dispatch-write.js';
import type { FencedWrite } from './fenced-write.js';
import type { SagaPurge } from './saga-purge.js';

/**
 * Puerto que persiste las instancias de saga y su bitácora de pasos. Toda
 * implementación pasa `runSagaStoreContract` de `@platform/saga/test-utils`.
 */
export abstract class SagaStore {
  /** Sagas que `purge` borra por llamada si no se pide otro límite: lotes cortos que no bloquean la tabla. */
  static readonly DEFAULT_PURGE_LIMIT = 500;

  /** Inserta una instancia nueva. @throws SagaError `DuplicateSaga` si el id o la llave de idempotencia ya existen. */
  abstract create(instance: SagaInstance): Promise<void>;

  /** Devuelve la instancia o `null`. */
  abstract get(id: string): Promise<SagaInstance | null>;

  /** Devuelve la instancia con esta llave de idempotencia, o `null`. */
  abstract findByIdempotencyKey(key: string): Promise<SagaInstance | null>;

  /**
   * Comprueba de forma atómica el token del lease y la versión, y escribe
   * juntas la instancia y la entrada de bitácora opcional. La entrada que ya
   * existe para el mismo paso y dirección se reemplaza. Devuelve la instancia
   * guardada, con la versión subida en uno.
   * @throws SagaError `NotFound` si la saga no existe, `LeaseLost` si el token
   *   no coincide y `ConcurrentModification` si la versión no coincide; en los
   *   tres casos no se escribe nada.
   */
  abstract commitStep(write: FencedWrite): Promise<SagaInstance>;

  /**
   * Escritura protegida de una entrada `Dispatched` junto con la instancia.
   * @throws SagaError `InvalidState` si la entrada no está en `Dispatched`, y los de `commitStep`.
   */
  abstract dispatchStep(write: DispatchWrite): Promise<SagaInstance>;

  /** Bitácora de una saga, ordenada por índice de paso y, dentro de él, hacia delante antes que compensar. */
  abstract steps(sagaId: string): Promise<StepLogEntry[]>;

  /**
   * Instancias que necesitan una corrida: `Running` o `Compensating` con el
   * lease vencido, o `Suspended` con `nextAttemptAt <= now`. Las más antiguas
   * primero (`updatedAt`, luego `id`). Con varios shards recorre todos.
   */
  abstract findRecoverable(now: Date, limit: number): Promise<SagaInstance[]>;

  /** Toma el lease para `token` hasta `until` si está libre o vencido. */
  abstract tryAcquireLease(
    id: string,
    token: string,
    until: Date,
    now: Date,
  ): Promise<boolean>;

  /** Extiende el lease si `token` aún lo tiene. Devuelve `false` si se perdió. */
  abstract renewLease(id: string, token: string, until: Date): Promise<boolean>;

  /** Suelta el lease si `token` lo tiene. */
  abstract releaseLease(id: string, token: string): Promise<void>;

  /** Borra las sagas terminadas con éxito (`Completed`, `Compensated`) y su bitácora. Devuelve cuántas. */
  abstract purge(options: SagaPurge): Promise<number>;
}
