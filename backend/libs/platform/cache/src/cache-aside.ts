import { SystemClock, SystemRandomSource } from '@platform/kernel';
import { PolicyName } from '@platform/resilience';
import type { CachePort } from './cache-port.js';
import { CallerWait } from './caller-wait.js';
import { FlightOutcomeKind } from './flight-outcome-kind.enum.js';
import type { CallerWaitOptions } from './caller-wait.options.js';
import type { CacheErrorReporter } from './cache-error-reporter.js';
import { CacheCorruptEntryError } from './errors/cache-corrupt-entry.error.js';
import { CacheValueTooLargeError } from './errors/cache-value-too-large.error.js';
import { NoopCacheErrorReporter } from './noop-cache-error-reporter.js';
import { NoTransactionScope } from './no-transaction-scope.js';
import { SingleFlight } from './single-flight.js';
import { TtlJitter } from './ttl-jitter.js';
import type {
  CacheAsideCollaborators,
  CacheAsideOptions,
  CacheEnvelope,
  CacheResilience,
  CacheTransactions,
  GetOrLoadOptions,
} from './cache-aside.options.js';
import type { VersionedKeyspace } from './versioned-keyspace.js';

/** Lo que el líder de un vuelo compartido entrega: el texto crudo o el valor ya cargado. */
type FlightOutcome<T> =
  | { readonly kind: FlightOutcomeKind.Raw; readonly raw: string }
  | { readonly kind: FlightOutcomeKind.Value; readonly value: T };

/**
 * Lecturas de caché con llaves versionadas, TTL repartido y cargas deduplicadas.
 * Las fallas del caché, los tiempos agotados y el circuito abierto caen a la
 * carga directa y se reportan; un error de `load` llega a todos los llamadores
 * que esperan esa llave.
 */
export class CacheAside {
  /** Tamaño máximo de una entrada serializada, en bytes UTF-8 (512 KiB). */
  static readonly MAX_VALUE_BYTES = 512 * 1024;

  private readonly wait: CallerWait;
  private readonly singleFlight: SingleFlight;
  private readonly jitter: TtlJitter;
  private readonly transactions: CacheTransactions;
  private readonly reporter: CacheErrorReporter;
  private readonly resilience: CacheResilience;
  private readonly dependencyKey: string | undefined;

  constructor(
    private readonly cache: CachePort,
    private readonly keyspace: VersionedKeyspace,
    options: CacheAsideOptions,
    collaborators: CacheAsideCollaborators = {},
  ) {
    // Los valores por defecto existen para usar la clase sin NestJS; en la aplicación llegan inyectados.
    this.wait = collaborators.wait ?? new CallerWait(new SystemClock());
    this.singleFlight =
      collaborators.singleFlight ?? new SingleFlight(this.wait);
    this.jitter =
      collaborators.jitter ?? new TtlJitter(new SystemRandomSource());
    this.transactions = options.transactions ?? new NoTransactionScope();
    this.reporter = options.reporter ?? new NoopCacheErrorReporter();
    this.resilience = options.resilience;
    this.dependencyKey = options.dependencyKey;
  }

  /**
   * Devuelve el valor cacheado de la consulta o lo carga y lo guarda en segundo
   * plano. Las fallas del caché caen a `load` y se reportan.
   * Los errores de `load` llegan a todos los llamadores concurrentes de la llave.
   * La señal y el plazo del llamador solo acotan su propia espera.
   */
  async getOrLoad<T>(options: GetOrLoadOptions<T>): Promise<T> {
    const { namespace, params, ttlMs, load } = options;
    const wait: CallerWaitOptions = {
      signal: options.signal,
      deadline: options.deadline,
    };
    const cancelled = this.wait.cancellation(wait);
    if (cancelled !== undefined) {
      throw cancelled;
    }
    if (this.transactions.isInTransaction()) {
      return this.wait.wait(load(), wait);
    }
    const serialize =
      options.serialize ??
      ((envelope: CacheEnvelope<T>): string => JSON.stringify(envelope));
    const deserialize =
      options.deserialize ??
      ((raw: string): CacheEnvelope<T> => JSON.parse(raw) as CacheEnvelope<T>);

    let key: string;
    try {
      key = await this.wait.wait(
        this.guarded(() => this.keyspace.key(namespace, params)),
        wait,
      );
    } catch (error) {
      return this.fallback(error, load, wait);
    }

    const outcome = await this.singleFlight.run(
      key,
      () => this.fetchOrLoad(key, ttlMs, load, serialize),
      wait,
    );
    if (outcome.kind === FlightOutcomeKind.Value) {
      return outcome.value;
    }
    try {
      const envelope = deserialize(outcome.raw);
      if (typeof envelope !== 'object' || envelope === null) {
        throw new CacheCorruptEntryError('not an envelope');
      }
      return envelope.v;
    } catch (error) {
      return this.fallback(error, load, wait);
    }
  }

  /**
   * Absorbe una falla del caché cargando directo, salvo que el llamador ya se
   * haya rendido: entonces rechaza con su cancelación y no arranca la carga.
   */
  private fallback<T>(
    error: unknown,
    load: () => Promise<T>,
    wait: CallerWaitOptions,
  ): Promise<T> {
    const cancelled = this.wait.cancellation(wait);
    if (cancelled !== undefined) {
      return Promise.reject(cancelled);
    }
    this.reporter.report(error);
    return this.wait.wait(load(), wait);
  }

  /**
   * Vuelve inalcanzables los resultados cacheados del espacio de nombres
   * cambiando su versión. Nunca lanza: las fallas se reportan, así que un caché
   * caído no hace fallar la escritura.
   *
   * Dentro de una transacción el cambio se repite después del commit. Un lector
   * fuera de la transacción puede cargar el dato viejo entre el primer cambio y
   * el commit y guardarlo bajo la versión nueva; el cambio posterior deja
   * inalcanzable esa entrada. Si la transacción se deshace, no hay cambio posterior.
   */
  async invalidate(namespace: readonly string[]): Promise<void> {
    await this.bumpSafely(namespace);
    if (!this.transactions.isInTransaction()) {
      return;
    }
    try {
      this.transactions.afterCommit?.(() => this.bumpSafely(namespace));
    } catch (error) {
      this.reporter.report(error);
    }
  }

  /** Camino del líder del vuelo: lee el caché y, si falta, carga y guarda en segundo plano. */
  private async fetchOrLoad<T>(
    key: string,
    ttlMs: number,
    load: () => Promise<T>,
    serialize: (envelope: CacheEnvelope<T>) => string,
  ): Promise<FlightOutcome<T>> {
    const cached = await this.readRaw(key);
    if (cached !== undefined) {
      return { kind: FlightOutcomeKind.Raw, raw: cached };
    }
    const value = await load();
    let raw: string;
    try {
      raw = serialize({ v: value });
    } catch (error) {
      this.reporter.report(error);
      return { kind: FlightOutcomeKind.Value, value };
    }
    const bytes = Buffer.byteLength(raw, 'utf8');
    if (bytes > CacheAside.MAX_VALUE_BYTES) {
      // Se sirve, pero nunca se escribe una entrada enorme en el caché compartido.
      this.reporter.report(
        new CacheValueTooLargeError(bytes, CacheAside.MAX_VALUE_BYTES),
      );
      return { kind: FlightOutcomeKind.Raw, raw };
    }
    // Escritura en segundo plano: quien llama no espera. `store` nunca rechaza.
    void this.store(key, raw, ttlMs);
    return { kind: FlightOutcomeKind.Raw, raw };
  }

  private async readRaw(key: string): Promise<string | undefined> {
    try {
      return await this.guarded(() => this.cache.get(key));
    } catch (error) {
      this.reporter.report(error);
      return undefined;
    }
  }

  private async store(key: string, raw: string, ttlMs: number): Promise<void> {
    try {
      const ttl = this.jitter.jitter(ttlMs);
      await this.guarded(() => this.cache.set(key, raw, ttl));
    } catch (error) {
      this.reporter.report(error);
    }
  }

  private async bumpSafely(namespace: readonly string[]): Promise<void> {
    try {
      await this.guarded(() => this.keyspace.bump(namespace));
    } catch (error) {
      this.reporter.report(error);
    }
  }

  /**
   * Ejecuta una llamada al caché bajo `PolicyName.Cache`. La política controla el
   * plazo y el circuito: con Valkey caído, tras pocas fallas el circuito se abre
   * y las llamadas siguientes fallan de inmediato con `CircuitOpenError`.
   */
  private guarded<T>(operation: () => Promise<T>): Promise<T> {
    return this.resilience.execute(PolicyName.Cache, operation, {
      dependencyKey: this.dependencyKey,
    });
  }
}
