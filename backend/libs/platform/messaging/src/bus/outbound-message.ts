import {
  type Clock,
  type IdGenerator,
  SystemClock,
  UuidV7IdGenerator,
} from '@platform/kernel';
import {
  Redactor,
  TraceContextRestorer,
  Tracing,
} from '@platform/observability';
import {
  type CommandDefinition,
  type EventDefinition,
  type MessageDefinition,
  type MessageInput,
  type MessageOutput,
} from '../contracts/message-contract.js';
import { EnvelopeFactory } from '../envelope/envelope-factory.js';
import { EnvelopeValidator } from '../envelope/envelope-validator.js';
import type { MessageEnvelope } from '../envelope/message-envelope.js';
import { MessagingError } from '../errors/messaging-error.js';
import type { OutboundTarget } from '../outbox/outbox.js';
import type { RouteDef } from '../topology/route-def.js';
import type { Topology } from '../topology/topology.js';
import {
  MAX_SEND_DELAY_MS,
  type PublishOptions,
  type SendOptions,
} from './message-bus.js';
import { MessagingErrorCode } from '../errors/messaging-error-code.enum.js';

/** Longitud máxima de `groupId` que aceptan SNS y SQS FIFO. */
export const MAX_GROUP_ID_LENGTH = 128;

/** `MessageGroupId` de SNS y SQS: de 1 a 128 caracteres ASCII imprimibles, sin espacios. */
const GROUP_ID = /^[\x21-\x7E]+$/;

/** Mensaje validado, listo para un transporte o para el outbox. */
export interface OutboundMessage<T = unknown> {
  readonly envelope: MessageEnvelope<T>;
  readonly route: RouteDef;
  readonly target: OutboundTarget;
  readonly groupId?: string;
  /** Solo en comandos. */
  readonly delayMs?: number;
}

/** Opciones de {@link OutboundMessageFactory}. */
export interface OutboundMessageFactoryOptions {
  /** Valor del atributo `source` del sobre. */
  readonly source: string;
  /** Reloj de los tiempos del sobre. Por defecto, el del sistema. */
  readonly clock?: Clock;
  /** Generador de ids de los sobres. Por defecto, UUIDv7. */
  readonly ids?: IdGenerator;
  /** Fuente del `traceparent` por defecto. Por defecto, el del span activo. */
  readonly traceparent?: () => string | undefined;
}

/**
 * Arma el sobre de un evento o comando después de revisar todo lo que un
 * transporte rechazaría más tarde: la ruta y su tipo, el payload contra el
 * contrato, el id de grupo FIFO, la espera y el límite de tamaño. Lo comparten
 * todos los adaptadores de `MessageBus` (memoria, outbox, SNS y SQS).
 */
export class OutboundMessageFactory {
  private readonly topology: Topology;
  private readonly options: OutboundMessageFactoryOptions;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;
  private readonly traceparent: () => string | undefined;
  private readonly envelopes: EnvelopeFactory;
  private readonly validator = new EnvelopeValidator();

  constructor(topology: Topology, options: OutboundMessageFactoryOptions) {
    this.topology = topology;
    this.options = options;
    this.clock = options.clock ?? new SystemClock();
    this.ids = options.ids ?? new UuidV7IdGenerator();
    const restorer = new TraceContextRestorer(new Tracing(new Redactor()));
    this.traceparent = options.traceparent ?? (() => restorer.current());
    this.envelopes = new EnvelopeFactory(this.clock, this.ids);
  }

  /** Valida y arma un evento. */
  event<M extends EventDefinition>(
    event: M,
    data: MessageInput<M>,
    options: PublishOptions = {},
  ): OutboundMessage<MessageOutput<M>> {
    return this.build(event, data, options, undefined);
  }

  /** Valida y arma un comando. */
  command<M extends CommandDefinition>(
    command: M,
    data: MessageInput<M>,
    options: SendOptions = {},
  ): OutboundMessage<MessageOutput<M>> {
    return this.build(command, data, options, options.delayMs ?? 0);
  }

  private build<M extends MessageDefinition>(
    contract: M,
    data: MessageInput<M>,
    options: PublishOptions,
    delayMs: number | undefined,
  ): OutboundMessage<MessageOutput<M>> {
    const route = this.route(contract);
    const groupId = this.groupId(route, options.groupId);
    if (delayMs !== undefined) this.checkDelay(route, delayMs);

    const parsed = contract.schema.safeParse(data);
    if (!parsed.success) {
      throw new MessagingError(
        MessagingErrorCode.InvalidPayload,
        `invalid payload for "${contract.type}": ${parsed.error.message}`,
      );
    }
    const envelope = this.validator.toWire(
      this.envelopes.create({
        type: contract.type,
        source: this.options.source,
        data: parsed.data as MessageOutput<M>,
        subject: options.subject,
        traceparent: options.traceparent ?? this.traceparent(),
        tenantId: options.tenantId,
        actorId: options.actorId,
      }),
    );
    return {
      envelope,
      route,
      target: {
        kind: route.targetKind,
        name: route.target.name,
        fifo: route.fifo,
      },
      ...(groupId === undefined ? {} : { groupId }),
      ...(delayMs === undefined ? {} : { delayMs }),
    };
  }

  private route(contract: MessageDefinition): RouteDef {
    const route = this.topology.routeFor(contract.type);
    if (!route || route.kind !== contract.kind) {
      throw new MessagingError(
        MessagingErrorCode.UnknownRoute,
        `no ${contract.kind} route for type "${contract.type}"`,
      );
    }
    return route;
  }

  private groupId(
    route: RouteDef,
    groupId: string | undefined,
  ): string | undefined {
    if (groupId === undefined) {
      if (route.fifo) {
        throw new MessagingError(
          MessagingErrorCode.InvalidOptions,
          `"${route.type}" goes to the FIFO ${route.targetKind} "${route.target.name}" and needs a groupId`,
        );
      }
      return undefined;
    }
    if (groupId.length > MAX_GROUP_ID_LENGTH || !GROUP_ID.test(groupId)) {
      throw new MessagingError(
        MessagingErrorCode.InvalidOptions,
        `groupId must be 1 to ${MAX_GROUP_ID_LENGTH} printable ASCII characters without spaces`,
      );
    }
    return groupId;
  }

  private checkDelay(route: RouteDef, delayMs: number): void {
    if (
      !Number.isFinite(delayMs) ||
      delayMs < 0 ||
      delayMs > MAX_SEND_DELAY_MS
    ) {
      throw new MessagingError(
        MessagingErrorCode.InvalidOptions,
        `delayMs must be between 0 and ${MAX_SEND_DELAY_MS}; longer delays need the scheduler`,
      );
    }
    if (delayMs > 0 && route.fifo) {
      throw new MessagingError(
        MessagingErrorCode.InvalidOptions,
        `FIFO queue "${route.target.name}" does not support per-message delays`,
      );
    }
  }
}
