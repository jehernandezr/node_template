import type { TransactionManager } from '@platform/kernel';
import type { Deadline } from '@platform/primitives';
import type { ResilienceRegistry } from '@platform/resilience';
import type { CacheErrorReporter } from './cache-error-reporter.js';
import type { CallerWait } from './caller-wait.js';
import type { SingleFlight } from './single-flight.js';
import type { TtlJitter } from './ttl-jitter.js';

/**
 * Lo que `CacheAside` necesita de `@platform/resilience`: ejecutar una llamada
 * bajo una política con nombre. Un `ResilienceRegistry` lo cumple.
 */
export type CacheResilience = Pick<ResilienceRegistry, 'execute'>;

/**
 * Lo que `CacheAside` necesita del gestor de transacciones: saber si la llamada
 * corre dentro de una transacción y registrar un efecto para después del
 * commit. El `TransactionManager` del kernel lo cumple. `afterCommit` es
 * opcional para aceptar ámbitos que solo saben si hay transacción; sin él, la
 * invalidación no se repite después del commit.
 */
export type CacheTransactions = Pick<TransactionManager, 'isInTransaction'> &
  Partial<Pick<TransactionManager, 'afterCommit'>>;

/** Opciones de `CacheAside`. */
export interface CacheAsideOptions {
  /**
   * Ejecuta cada llamada al caché bajo la política `PolicyName.Cache` (plazo por
   * intento, presupuesto total y circuito). Conviene pasar el `ResilienceRegistry`
   * compartido de la aplicación, para que las cachés de un mismo Valkey compartan circuito.
   */
  readonly resilience: CacheResilience;
  /**
   * Dentro de una transacción el caché se omite y `load` corre directo: la
   * transacción puede ver filas sin confirmar que no deben llegar a otros
   * lectores, y un valor cacheado ocultaría sus propias escrituras.
   */
  readonly transactions?: CacheTransactions;
  /** Recibe las fallas que se absorbieron cargando directo. Por defecto no hace nada. */
  readonly reporter?: CacheErrorReporter;
  /**
   * Llave del circuito y del compartimento de aislamiento dentro de la política,
   * por ejemplo uno por clúster de Valkey. Por defecto, el nombre de la política.
   */
  readonly dependencyKey?: string;
}

/** Dependencias opcionales de `CacheAside`. Si faltan, se crean con valores del sistema. */
export interface CacheAsideCollaborators {
  /** Deduplicador de cargas compartido. */
  readonly singleFlight?: SingleFlight;
  /** Reparto aleatorio del TTL. */
  readonly jitter?: TtlJitter;
  /** Espera de cada llamador. */
  readonly wait?: CallerWait;
}

/**
 * Valor envuelto en el caché. Guardar `{ v }` en vez del valor vuelve cacheables
 * los resultados `undefined` y `null`, y los distingue de un fallo.
 */
export interface CacheEnvelope<T> {
  v: T;
}

/** Argumentos de `CacheAside.getOrLoad`. */
export interface GetOrLoadOptions<T> {
  /** Espacio de nombres para la versión y la invalidación, por ejemplo `['tenant', 't1', 'orders']`. */
  readonly namespace: readonly string[];
  /** Parámetros de la consulta que identifican el resultado. Deben ser JSON canónico. */
  readonly params: unknown;
  /** TTL base en milisegundos. El TTL que se guarda sale repartido alrededor de él. */
  readonly ttlMs: number;
  /** Carga el valor autoritativo, normalmente desde la base de datos. */
  readonly load: () => Promise<T>;
  /** Convierte el sobre `{ v }` en texto. Por defecto, `JSON.stringify`. */
  readonly serialize?: (envelope: CacheEnvelope<T>) => string;
  /** Convierte el texto guardado de vuelta en el sobre `{ v }`. Por defecto, `JSON.parse`. */
  readonly deserialize?: (raw: string) => CacheEnvelope<T>;
  /** Quien llama deja de esperar y rechaza con el motivo de la señal. La carga compartida sigue para los demás. */
  readonly signal?: AbortSignal;
  /** Quien llama deja de esperar y rechaza con `DeadlineExceededError`. La carga compartida sigue para los demás. */
  readonly deadline?: Deadline;
}
