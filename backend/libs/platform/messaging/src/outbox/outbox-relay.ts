import {
  type Clock,
  ErrorDescriptor,
  type IdGenerator,
  type RandomSource,
  SystemClock,
  SystemRandomSource,
  UuidV7IdGenerator,
} from '@platform/kernel';
import { Backoff, type RetryPolicy } from '@platform/primitives';
import { ResilienceErrorCode } from '@platform/resilience';
import { MessagingGuard } from '../errors/messaging-guard.js';
import { EnvelopeValidator } from '../envelope/envelope-validator.js';
import type { Topology } from '../topology/topology.js';
import type { OutboundTarget, OutboxLease, OutboxRecord } from './outbox.js';
import { EnvelopeLimits } from '../envelope/envelope-limits.js';
import { type EnvelopePublisher } from './envelope-publisher.js';
import { type OutboxStore } from './outbox-store.js';

/** Dependencias y ajustes del relay. */
export interface OutboxRelayOptions {
  readonly store: OutboxStore;
  readonly publisher: EnvelopePublisher;
  readonly topology: Topology;
  /**
   * Espera entre intentos fallidos, con tope en `maxMs`. Una falla de transporte
   * nunca agota los intentos: el registro se reintenta hasta que el destino
   * vuelva.
   */
  readonly retryPolicy: RetryPolicy;
  /** Registros tomados con lease por pasada. Por defecto, 100. */
  readonly batchSize?: number;
  /**
   * Etiqueta del dueño del lease. Cada instancia del relay agrega su propio id
   * tomado de `ids`, así las réplicas nunca comparten dueño. Por defecto,
   * `outbox-relay`.
   */
  readonly owner?: string;
  /** Duración del lease en milisegundos. Por defecto, 30 segundos. */
  readonly leaseMs?: number;
  /** Fuente del tiempo. Por defecto, el reloj del sistema. */
  readonly clock?: Clock;
  /** Fuente del id de la instancia y de los tokens de lease de cada pasada. Por defecto, UUIDv7. */
  readonly ids?: IdGenerator;
  /** Fuente del jitter de la espera entre intentos. Por defecto, la aleatoria del sistema. */
  readonly random?: RandomSource;
}

/** Conteos de una pasada de {@link OutboxRelay.relayOnce}. */
export interface RelayReport {
  readonly claimed: number;
  readonly published: number;
  /** Intentos fallidos que se reprogramaron. */
  readonly failed: number;
  /** Registros que nunca se podrán entregar (sin ruta, demasiado grandes o fuera de contrato), dados por muertos. */
  readonly dead: number;
  /**
   * Registros que no se publicaron porque un registro anterior de su grupo
   * falló o se perdió en esta pasada. Se libera su lease y se conserva el orden.
   */
  readonly deferred: number;
  /**
   * Registros cuyo lease se perdió (venció antes de publicar, o una marca se
   * rechazó porque otro relay tomó el registro).
   */
  readonly stale: number;
}

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_OWNER = 'outbox-relay';
const DEFAULT_LEASE_MS = 30_000;

/**
 * Publica los registros del outbox que ya están vencidos, uno a uno y en orden
 * de `createdAt`. Cada registro se marca justo después de su publicación. La
 * entrega es al menos una vez: una caída entre la publicación y la marca puede
 * duplicar un mensaje, que los consumidores idempotentes absorben.
 *
 * Fencing: cada instancia del relay tiene su propio id de dueño, y cada pasada
 * toma sus registros con un token nuevo. Las marcas solo se aplican mientras ese
 * lease sigue vigente, y un registro cuyo lease ya venció no se publica.
 *
 * FIFO por `groupId`: cuando un registro de un grupo falla (o se pierde su
 * lease), los registros posteriores de ese grupo no se publican en esa pasada;
 * su lease se libera para que conserven su lugar detrás del fallido.
 *
 * `Dead` queda para lo que nunca se podrá entregar. Una falla de transporte se
 * reintenta sin límite con la espera de `retryPolicy`, y el rechazo de un
 * circuit breaker abierto ni siquiera cuenta como intento: el registro suelta su
 * lease y espera a la pasada siguiente. Un registro `Dead` no bloquea a su
 * grupo: no se va a entregar nunca y frenaría para siempre a los que siguen. Un
 * registro cuyo lease venció no se publica, porque otro relay puede tenerlo y
 * publicarlo desordenaría el grupo.
 */
export class OutboxRelay {
  /** Dueño del lease de esta instancia del relay: `<etiqueta>:<id de instancia>`. */
  readonly ownerId: string;

  private readonly options: OutboxRelayOptions;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;
  private readonly backoff: Backoff;
  private readonly validator = new EnvelopeValidator();

  constructor(options: OutboxRelayOptions) {
    options.topology.assertValid();
    const guard = MessagingGuard.instance;
    if (options.batchSize !== undefined) {
      guard.positiveInteger('batchSize', options.batchSize);
    }
    if (options.leaseMs !== undefined) {
      guard.positiveInteger('leaseMs', options.leaseMs);
    }
    this.backoff = new Backoff(
      options.retryPolicy,
      options.random ?? new SystemRandomSource(),
    );
    this.options = options;
    this.clock = options.clock ?? new SystemClock();
    this.ids = options.ids ?? new UuidV7IdGenerator();
    this.ownerId = `${options.owner ?? DEFAULT_OWNER}:${this.ids.next().toString()}`;
  }

  /** Corre una pasada sobre los registros vencidos a esta hora. */
  async relayOnce(): Promise<RelayReport> {
    const { store, publisher } = this.options;
    const passStart = this.clock.now().getTime();
    const current = (): number => this.clock.now().getTime();

    const lease: OutboxLease = {
      owner: this.ownerId,
      token: this.ids.next().toString(),
    };
    const records = await store.claimPending({
      now: new Date(passStart),
      limit: this.options.batchSize ?? DEFAULT_BATCH_SIZE,
      lease,
      leaseMs: this.options.leaseMs ?? DEFAULT_LEASE_MS,
    });

    const blockedGroups = new Set<string>();
    const block = (record: OutboxRecord): void => {
      if (record.groupId !== undefined) blockedGroups.add(record.groupId);
    };
    let published = 0;
    let failed = 0;
    let dead = 0;
    let deferred = 0;
    let stale = 0;

    for (const record of records) {
      if (record.groupId !== undefined && blockedGroups.has(record.groupId)) {
        if (await store.releaseLease(record.id, lease)) deferred++;
        else stale++;
        continue;
      }

      const target = this.targetFor(record);
      if (typeof target === 'string') {
        if (await store.markDead(record.id, lease, target)) dead++;
        else {
          stale++;
          block(record);
        }
        continue;
      }

      const expiresAt = record.leaseExpiresAt?.getTime();
      if (expiresAt !== undefined && current() >= expiresAt) {
        stale++;
        block(record);
        continue;
      }

      const delayMs = this.remainingDelay(record, current());
      try {
        await publisher.publish(record.envelope, target, {
          groupId: record.groupId,
          ...(delayMs > 0 ? { delayMs } : {}),
        });
      } catch (err) {
        if (ErrorDescriptor.codeOf(err) === ResilienceErrorCode.CircuitOpen) {
          if (await store.releaseLease(record.id, lease)) deferred++;
          else stale++;
          block(record);
          continue;
        }
        const message = ErrorDescriptor.describe(err).message;
        const delay = this.backoff.delay(
          Math.min(record.attempts + 1, Backoff.MAX_ATTEMPT),
        );
        const marked = await store.markFailed(
          record.id,
          lease,
          message,
          new Date(passStart + delay),
        );
        if (marked) failed++;
        else stale++;
        block(record);
        continue;
      }

      if (await store.markPublished(record.id, lease)) published++;
      else {
        stale++;
        block(record);
      }
    }

    return {
      claimed: records.length,
      published,
      failed,
      dead,
      deferred,
      stale,
    };
  }

  /** Lo que resta de la espera de un comando, contada desde la creación del registro. */
  private remainingDelay(record: OutboxRecord, now: number): number {
    if (!record.delayMs) return 0;
    return Math.max(0, record.createdAt.getTime() + record.delayMs - now);
  }

  /**
   * Resuelve el destino, o devuelve el motivo por el que el registro no se puede
   * entregar nunca: no hay ruta, el sobre supera el límite de tamaño, el payload
   * rompe el contrato de la ruta (moriría en la DLQ de todos los consumidores) o
   * el destino es FIFO y el registro no tiene id de grupo.
   */
  private targetFor(record: OutboxRecord): OutboundTarget | string {
    const { type } = record.envelope;
    const route = this.options.topology.routeFor(type);
    if (!route) return `no route for type "${type}"`;
    const size = this.validator.sizeBytes(record.envelope);
    if (size > EnvelopeLimits.MAX_BYTES)
      return `payload is ${size} bytes, limit is ${EnvelopeLimits.MAX_BYTES}`;
    if (!route.contract) return `route "${type}" has no contract`;
    const parsed = route.contract.schema.safeParse(record.envelope.data);
    if (!parsed.success) {
      return `invalid payload for "${type}": ${parsed.error.message}`;
    }
    if (route.fifo && record.groupId === undefined) {
      return `"${type}" goes to a FIFO ${route.targetKind} and the record has no groupId`;
    }
    return {
      kind: route.targetKind,
      name: route.target.name,
      fifo: route.fifo,
    };
  }
}
