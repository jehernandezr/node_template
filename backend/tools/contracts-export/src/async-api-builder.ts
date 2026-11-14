import type {
  MessageDefinition,
  QueueDefinition,
  ServiceContract,
} from '@contracts/platform';
import {
  ASYNCAPI_VERSION,
  CONTRACT_EXPORT_FILE,
  EXPORT_DIR,
} from './export-constants.js';
import { ExportError } from './export-error.js';
import type { JsonObject } from './json.type.js';
import type { SchemaOwnership } from './schema-ownership.js';
import type { TopologyBuilder } from './topology-builder.js';

/** Acción de una operación AsyncAPI: el servicio publica o recibe. */
enum AsyncApiAction {
  Send = 'send',
  Receive = 'receive',
}

const CONTENT_TYPE = 'application/json';

/**
 * Documento AsyncAPI 3.0 de la mensajería: un canal por tópico y por cola, las
 * operaciones de publicar, enviar y recibir de cada servicio, y un mensaje por
 * evento y comando con su payload tomado del `contract.json` del dueño.
 */
export class AsyncApiBuilder {
  constructor(
    private readonly ownership: SchemaOwnership,
    private readonly topology: TopologyBuilder,
  ) {}

  build(contracts: readonly ServiceContract[]): JsonObject {
    // Valida la topología completa antes de documentarla.
    this.topology.build(contracts);
    const senders = this.sendersOf(contracts);
    const channels: JsonObject = {};
    const operations: JsonObject = {};
    for (const contract of contracts) {
      this.addTopics(contract, channels, operations);
      this.addQueues(contract, senders, channels, operations);
    }
    return {
      $comment:
        'GENERADO por backend/tools/contracts-export desde los contratos. No editar: ejecuta pnpm nx run contracts-export:export.',
      asyncapi: ASYNCAPI_VERSION,
      info: {
        title: 'Mensajería de la plataforma',
        version: '1.0.0',
        description:
          'Eventos y comandos entre servicios. Cada mensaje viaja en un sobre CloudEvents 1.0; el payload descrito aquí es el campo data. Los tópicos son SNS y las colas SQS.',
      },
      defaultContentType: CONTENT_TYPE,
      channels,
      operations,
      components: { messages: this.messagesOf(contracts) },
    };
  }

  /** Un mensaje por evento y comando, con el payload del contrato dueño del esquema. */
  private messagesOf(contracts: readonly ServiceContract[]): JsonObject {
    const owners = this.ownership.of(contracts);
    const messages: JsonObject = {};
    for (const contract of contracts) {
      for (const message of [
        ...Object.values(contract.events),
        ...Object.values(contract.commands),
      ]) {
        const owner = owners.get(message.payload);
        if (!owner) {
          throw ExportError.forAsyncApi(
            contract.service,
            `${message.type} usa un esquema sin nombre`,
          );
        }
        messages[message.type] = {
          name: message.type,
          title: message.type,
          summary: message.description,
          contentType: CONTENT_TYPE,
          payload: {
            $ref: `${owner.service}/${EXPORT_DIR}/${CONTRACT_EXPORT_FILE}#/schemas/${owner.name}`,
          },
          'x-kind': message.kind,
          'x-version': message.version,
          'x-owner': contract.service,
        };
      }
    }
    return messages;
  }

  private sendersOf(
    contracts: readonly ServiceContract[],
  ): Map<MessageDefinition, string[]> {
    const senders = new Map<MessageDefinition, string[]>();
    for (const contract of contracts) {
      for (const command of contract.sends) {
        senders.set(command, [
          ...(senders.get(command) ?? []),
          contract.service,
        ]);
      }
    }
    return senders;
  }

  /** Canal y operación de publicar de cada tópico del servicio. */
  private addTopics(
    contract: ServiceContract,
    channels: JsonObject,
    operations: JsonObject,
  ): void {
    const { service } = contract;
    for (const topic of Object.values(contract.topics)) {
      channels[topic.name] = {
        address: topic.name,
        description: `Tópico${topic.fifo ? ' FIFO' : ''} de ${service}. ${topic.description}`,
        messages: this.messageMap(topic.events),
      };
      operations[`${topic.name}.publish`] = {
        action: AsyncApiAction.Send,
        channel: this.channelRef(topic.name),
        summary: `${service} publica sus eventos.`,
        messages: topic.events.map((e) => this.messageRef(topic.name, e.type)),
        'x-producers': [service],
      };
    }
  }

  /**
   * Canal de cada cola del servicio con su operación de recibir y, si recibe
   * comandos, la de enviar con los servicios que los mandan.
   */
  private addQueues(
    contract: ServiceContract,
    senders: ReadonlyMap<MessageDefinition, readonly string[]>,
    channels: JsonObject,
    operations: JsonObject,
  ): void {
    const { service } = contract;
    for (const queue of Object.values(contract.queues)) {
      const delivered = this.deliveredMessages(queue);
      channels[queue.name] = {
        address: queue.name,
        description: `Cola${queue.fifo ? ' FIFO' : ''} de ${service}. ${queue.description}`,
        messages: this.messageMap(delivered),
      };
      operations[`${queue.name}.receive`] = {
        action: AsyncApiAction.Receive,
        channel: this.channelRef(queue.name),
        summary: `${service} consume la cola.`,
        messages: delivered.map((m) => this.messageRef(queue.name, m.type)),
        'x-consumer': service,
      };
      if (queue.commands.length > 0) {
        const producers = [
          ...new Set(queue.commands.flatMap((c) => senders.get(c) ?? [])),
        ].sort();
        operations[`${queue.name}.send`] = {
          action: AsyncApiAction.Send,
          channel: this.channelRef(queue.name),
          summary: `Comandos que recibe ${service}.`,
          messages: queue.commands.map((c) =>
            this.messageRef(queue.name, c.type),
          ),
          'x-producers': producers,
        };
      }
    }
  }

  private messageMap(list: readonly MessageDefinition[]): JsonObject {
    const map: JsonObject = {};
    for (const message of list) {
      map[message.type] = { $ref: `#/components/messages/${message.type}` };
    }
    return map;
  }

  private channelRef(channel: string): JsonObject {
    return { $ref: `#/channels/${channel}` };
  }

  private messageRef(channel: string, type: string): JsonObject {
    return { $ref: `#/channels/${channel}/messages/${type}` };
  }

  private deliveredMessages(queue: QueueDefinition): MessageDefinition[] {
    const messages: MessageDefinition[] = [...queue.commands];
    for (const subscription of queue.subscriptions) {
      messages.push(
        ...(subscription.events.length > 0
          ? subscription.events
          : subscription.topic.events),
      );
    }
    return messages;
  }
}
