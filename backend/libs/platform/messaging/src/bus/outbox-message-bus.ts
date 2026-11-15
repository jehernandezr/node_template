import {
  type Clock,
  SystemClock,
  type TransactionManager,
  type UnitOfWork,
} from '@platform/kernel';
import type {
  CommandDefinition,
  EventDefinition,
  MessageInput,
  MessageOutput,
} from '../contracts/message-contract.js';
import type { MessageEnvelope } from '../envelope/message-envelope.js';
import { MessagingError } from '../errors/messaging-error.js';
import type { Topology } from '../topology/topology.js';
import type { MessageBus, PublishOptions, SendOptions } from './message-bus.js';
import {
  type OutboundMessage,
  OutboundMessageFactory,
  type OutboundMessageFactoryOptions,
} from './outbound-message.js';
import { MessagingErrorCode } from '../errors/messaging-error-code.enum.js';
import { type OutboxWriter } from '../outbox/outbox-writer.js';

/** Dependencias de {@link OutboxMessageBus}. */
export interface OutboxMessageBusOptions extends OutboundMessageFactoryOptions {
  readonly topology: Topology;
  readonly writer: OutboxWriter;
  /** Transacciones del servicio: cada mensaje se guarda en la que esté abierta. */
  readonly transactions: TransactionManager;
  /**
   * Corre una vez después del commit de cada transacción que agregó mensajes.
   * `MessagingModule` lo cablea a `JobRunner.trigger(MessagingJob.OutboxRelay)`
   * para despertar al relay. Si falla, la transacción ya quedó confirmada y el
   * relay periódico publica igual.
   */
  readonly onCommitted?: () => void | Promise<void>;
}

/**
 * `MessageBus` respaldado por el outbox. Valida el mensaje contra su contrato y
 * su ruta (con las mismas reglas que cualquier otro bus), arma el sobre y lo
 * guarda en la transacción abierta, así el mensaje existe si y solo si el cambio
 * de negocio se confirmó. El `OutboxRelay` lo publica después del commit.
 *
 * Fuera de una transacción lanza `PLATFORM.MESSAGING.TRANSACTION_REQUIRED`:
 * publicar sin una es justo lo que evita el outbox.
 */
export class OutboxMessageBus implements MessageBus {
  private readonly options: OutboxMessageBusOptions;
  private readonly factory: OutboundMessageFactory;
  private readonly clock: Clock;
  /** Unidades de trabajo que ya tienen registrado el aviso de commit. */
  private readonly notified = new WeakSet<UnitOfWork>();

  constructor(options: OutboxMessageBusOptions) {
    options.topology.assertValid();
    this.options = options;
    this.clock = options.clock ?? new SystemClock();
    this.factory = new OutboundMessageFactory(options.topology, {
      ...options,
      clock: this.clock,
    });
  }

  async publish<M extends EventDefinition>(
    event: M,
    data: MessageInput<M>,
    options?: PublishOptions,
  ): Promise<MessageEnvelope<MessageOutput<M>>> {
    const uow = this.requireUnitOfWork(event.type);
    return this.append(this.factory.event(event, data, options), uow);
  }

  async send<M extends CommandDefinition>(
    command: M,
    data: MessageInput<M>,
    options?: SendOptions,
  ): Promise<MessageEnvelope<MessageOutput<M>>> {
    const uow = this.requireUnitOfWork(command.type);
    return this.append(this.factory.command(command, data, options), uow);
  }

  private requireUnitOfWork(type: string): UnitOfWork {
    const uow = this.options.transactions.current();
    if (!uow) {
      throw new MessagingError(
        MessagingErrorCode.TransactionRequired,
        `"${type}" must be published inside a transaction (runInTransaction)`,
      );
    }
    return uow;
  }

  private async append<T>(
    message: OutboundMessage<T>,
    uow: UnitOfWork,
  ): Promise<MessageEnvelope<T>> {
    await this.options.writer.append({
      envelope: message.envelope,
      createdAt: this.clock.now(),
      ...(message.groupId === undefined ? {} : { groupId: message.groupId }),
      ...(message.delayMs ? { delayMs: message.delayMs } : {}),
    });
    const onCommitted = this.options.onCommitted;
    if (onCommitted && !this.notified.has(uow)) {
      this.notified.add(uow);
      uow.afterCommit(onCommitted);
    }
    return message.envelope;
  }
}
