import type {
  MessageDefinition,
  QueueDefinition,
  ServiceContract,
} from '@contracts/platform';
import { ownersOf, type Json, type JsonObject } from './build-export.js';
import { buildTopology } from './build-topology.js';

/** Versión de AsyncAPI del documento generado. */
export const ASYNCAPI_VERSION = '3.0.0';

/** Ruta de `asyncapi.json`, relativa a `backend/`. Sus `$ref` apuntan a cada `contract.json`. */
export const ASYNCAPI_PATH = 'libs/contracts/asyncapi.json';

const channelRef = (channel: string) => ({ $ref: `#/channels/${channel}` });
const messageRef = (channel: string, type: string) => ({
  $ref: `#/channels/${channel}/messages/${type}`,
});

function deliveredMessages(queue: QueueDefinition): MessageDefinition[] {
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

/**
 * Documento AsyncAPI 3.0 de la mensajería: un canal por tópico y por cola, las
 * operaciones de publicar, enviar y recibir de cada servicio, y un mensaje por
 * evento y comando con su payload tomado del `contract.json` del dueño.
 */
export function buildAsyncApi(
  contracts: readonly ServiceContract[],
): JsonObject {
  // Valida la topología completa antes de documentarla.
  buildTopology(contracts);
  const owners = ownersOf(contracts);

  const messages: JsonObject = {};
  const addMessage = (message: MessageDefinition, service: string) => {
    const owner = owners.get(message.payload);
    if (!owner) {
      throw new Error(
        `asyncapi (${service}): ${message.type} usa un esquema sin nombre`,
      );
    }
    messages[message.type] = {
      name: message.type,
      title: message.type,
      summary: message.description,
      contentType: 'application/json',
      payload: {
        $ref: `${owner.service}/export/contract.json#/schemas/${owner.name}`,
      },
      'x-kind': message.kind,
      'x-version': message.version,
      'x-owner': service,
    };
  };
  for (const contract of contracts) {
    for (const message of [
      ...Object.values(contract.events),
      ...Object.values(contract.commands),
    ]) {
      addMessage(message, contract.service);
    }
  }

  const channels: JsonObject = {};
  const operations: JsonObject = {};
  const messageMap = (list: readonly MessageDefinition[]): JsonObject => {
    const map: JsonObject = {};
    for (const message of list) {
      map[message.type] = { $ref: `#/components/messages/${message.type}` };
    }
    return map;
  };
  const sendersOf = new Map<MessageDefinition, string[]>();
  for (const contract of contracts) {
    for (const command of contract.sends) {
      sendersOf.set(command, [
        ...(sendersOf.get(command) ?? []),
        contract.service,
      ]);
    }
  }

  for (const contract of contracts) {
    const { service } = contract;
    for (const topic of Object.values(contract.topics)) {
      channels[topic.name] = {
        address: topic.name,
        description: `Tópico${topic.fifo ? ' FIFO' : ''} de ${service}. ${topic.description}`,
        messages: messageMap(topic.events),
      };
      operations[`${topic.name}.publish`] = {
        action: 'send',
        channel: channelRef(topic.name),
        summary: `${service} publica sus eventos.`,
        messages: topic.events.map((e) => messageRef(topic.name, e.type)),
        'x-producers': [service],
      };
    }
    for (const queue of Object.values(contract.queues)) {
      const delivered = deliveredMessages(queue);
      channels[queue.name] = {
        address: queue.name,
        description: `Cola${queue.fifo ? ' FIFO' : ''} de ${service}. ${queue.description}`,
        messages: messageMap(delivered),
      };
      operations[`${queue.name}.receive`] = {
        action: 'receive',
        channel: channelRef(queue.name),
        summary: `${service} consume la cola.`,
        messages: delivered.map((m) => messageRef(queue.name, m.type)),
        'x-consumer': service,
      };
      if (queue.commands.length > 0) {
        const producers = [
          ...new Set(queue.commands.flatMap((c) => sendersOf.get(c) ?? [])),
        ].sort();
        operations[`${queue.name}.send`] = {
          action: 'send',
          channel: channelRef(queue.name),
          summary: `Comandos que recibe ${service}.`,
          messages: queue.commands.map((c) => messageRef(queue.name, c.type)),
          'x-producers': producers,
        };
      }
    }
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
    defaultContentType: 'application/json',
    channels,
    operations,
    components: { messages } as Json,
  };
}
