import { PlatformErrorCode } from '@contracts/platform';
import { type Clock, SystemClock } from '@platform/kernel';
import type { TransactionManager, UnitOfWork } from '@platform/primitives';
import type {
  CommandDefinition,
  EventDefinition,
  MessageInput,
  MessageOutput,
} from '../contracts/message-contract.js';
import type { MessageEnvelope } from '../envelope/message-envelope.js';
import { MessagingError } from '../errors/messaging-error.js';
import type { OutboxWriter } from '../outbox/outbox.js';
import type { Topology } from '../topology/topology.js';
import type { MessageBus, PublishOptions, SendOptions } from './message-bus.js';
import {
  type OutboundMessage,
  OutboundMessageFactory,
  type OutboundMessageFactoryOptions,
} from './outbound-message.js';

/** Dependencies of {@link OutboxMessageBus}. */
export interface OutboxMessageBusOptions extends OutboundMessageFactoryOptions {
  readonly topology: Topology;
  readonly writer: OutboxWriter;
  /** Transactions of the service: each message is stored in the open one. */
  readonly transactions: TransactionManager;
  /**
   * Runs once after the commit of each transaction that appended messages, for
   * example to wake the relay (`() => relay.relayOnce()`). If it fails, the
   * transaction is already committed and the periodic relay publishes anyway.
   */
  readonly onCommitted?: () => void | Promise<void>;
}

/**
 * `MessageBus` backed by the outbox. Validates the message against its contract
 * and its route (with the same rules as every other bus), builds the envelope
 * and stores it in the open transaction, so the message exists if and only if
 * the business change was committed. The `OutboxRelay` publishes it after the
 * commit.
 *
 * Outside a transaction it throws `PLATFORM.MESSAGING.TRANSACTION_REQUIRED`:
 * publishing without one is exactly what the outbox prevents.
 */
export class OutboxMessageBus implements MessageBus {
  private readonly options: OutboxMessageBusOptions;
  private readonly factory: OutboundMessageFactory;
  private readonly clock: Clock;
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
        PlatformErrorCode.MessagingTransactionRequired,
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
