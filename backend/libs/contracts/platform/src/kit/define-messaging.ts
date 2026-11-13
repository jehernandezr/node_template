import { ContractDefinitionError } from './contract-definition-error.js';
import type { CommandDefinition } from './define-command.js';
import type { EventDefinition } from './define-event.js';
import type { OperationRetryPolicy } from './define-operation.js';

/**
 * Tópico de un servicio: el punto de difusión de sus eventos. Cada evento del
 * servicio se publica en exactamente uno de sus tópicos.
 */
export interface TopicDefinition {
  /** Nombre lógico, `servicio-...`. Terraform le agrega el prefijo del ambiente. */
  readonly name: string;
  /** Entrega ordenada (SNS FIFO). Solo colas FIFO pueden suscribirse. */
  readonly fifo: boolean;
  readonly events: readonly EventDefinition[];
  readonly description: string;
}

export interface TopicSpec {
  readonly name: string;
  readonly fifo?: boolean;
  readonly events: readonly EventDefinition[];
  readonly description: string;
}

/** Suscripción de una cola a un tópico, propio o de otro servicio. */
export interface QueueSubscription {
  readonly topic: TopicDefinition;
  /** Eventos que recibe la cola. Vacío: todos los del tópico, sin filtro. */
  readonly events: readonly EventDefinition[];
}

export interface QueueSubscriptionSpec {
  readonly topic: TopicDefinition;
  /** Si se omite, la cola recibe todos los eventos del tópico. */
  readonly events?: readonly EventDefinition[];
}

/** Política de reintentos de una cola: entregas totales y backoff exponencial. */
export type QueueRetryPolicy = OperationRetryPolicy;

/** Cola de destino de los mensajes que fallan todos sus intentos. */
export interface DeadLetterPolicy {
  /** Recepciones antes de moverlo a la DLQ. Nunca menos que los intentos. */
  readonly maxReceiveCount: number;
  /** Días que la DLQ guarda un mensaje, de 1 a 14. */
  readonly retentionDays: number;
}

/**
 * Cola de un servicio: recibe sus comandos y los eventos de los tópicos a los
 * que se suscribe. El servicio dueño del contrato es su único consumidor.
 */
export interface QueueDefinition {
  /** Nombre lógico, `servicio-...`. La DLQ se llama `<name>-dlq`. */
  readonly name: string;
  readonly fifo: boolean;
  readonly visibilityTimeoutSeconds: number;
  readonly retry: QueueRetryPolicy;
  readonly deadLetter: DeadLetterPolicy;
  /** Comandos del propio servicio que llegan a esta cola. */
  readonly commands: readonly CommandDefinition[];
  readonly subscriptions: readonly QueueSubscription[];
  readonly description: string;
}

export interface QueueSpec {
  readonly name: string;
  readonly fifo?: boolean;
  /** Segundos que un mensaje queda invisible mientras se procesa. Por defecto 30. */
  readonly visibilityTimeoutSeconds?: number;
  /** Por defecto 5 intentos, 1 s de base y 5 min de tope. */
  readonly retry?: QueueRetryPolicy;
  /** Por defecto `maxReceiveCount` igual a los intentos y 14 días de retención. */
  readonly deadLetter?: Partial<DeadLetterPolicy>;
  readonly commands?: readonly CommandDefinition[];
  readonly subscriptions?: readonly QueueSubscriptionSpec[];
  readonly description: string;
}

/** Nombre de tópico o cola: minúsculas, dígitos y guiones (SNS y SQS). */
export const MESSAGING_NAME_PATTERN = /^[a-z][a-z0-9-]*[a-z0-9]$/;

/** Largo máximo del nombre lógico; deja lugar al prefijo, `-dlq` y `.fifo`. */
export const MESSAGING_NAME_MAX_LENGTH = 60;

/** Sufijo de la cola de mensajes fallidos. */
export const DEAD_LETTER_SUFFIX = '-dlq';

/** Valores por defecto de una cola; coinciden con los de `@platform/messaging`. */
export const QueueDefaults = {
  visibilityTimeoutSeconds: 30,
  maxVisibilityTimeoutSeconds: 43_200,
  retry: { maxAttempts: 5, baseMs: 1_000, maxMs: 300_000 },
  deadLetterRetentionDays: 14,
  maxDeadLetterRetentionDays: 14,
  maxReceiveCount: 1_000,
} as const;

function checkName(kind: string, name: string): void {
  if (
    !MESSAGING_NAME_PATTERN.test(name) ||
    name.length > MESSAGING_NAME_MAX_LENGTH ||
    name.endsWith(DEAD_LETTER_SUFFIX)
  ) {
    throw new ContractDefinitionError(
      `${kind} ${name}: nombre inválido (minúsculas, dígitos y guiones, hasta ${MESSAGING_NAME_MAX_LENGTH}, sin ${DEAD_LETTER_SUFFIX})`,
    );
  }
}

function checkUniqueTypes(
  where: string,
  messages: readonly { readonly type: string }[],
): void {
  const types = messages.map((m) => m.type);
  if (new Set(types).size !== types.length) {
    throw new ContractDefinitionError(`${where}: mensajes repetidos`);
  }
}

function isPositiveInt(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/** Declara un tópico con los eventos que se publican en él. */
export function defineTopic(spec: TopicSpec): TopicDefinition {
  const where = `Tópico ${spec.name}`;
  checkName('Tópico', spec.name);
  if (!spec.description.trim()) {
    throw new ContractDefinitionError(`${where}: falta la descripción`);
  }
  if (spec.events.length === 0) {
    throw new ContractDefinitionError(`${where}: no tiene eventos`);
  }
  checkUniqueTypes(where, spec.events);
  return Object.freeze({
    name: spec.name,
    fifo: spec.fifo ?? false,
    events: Object.freeze([...spec.events]),
    description: spec.description,
  });
}

/** Declara una cola con sus comandos, suscripciones, reintentos y DLQ. */
export function defineQueue(spec: QueueSpec): QueueDefinition {
  const where = `Cola ${spec.name}`;
  const fail = (reason: string): never => {
    throw new ContractDefinitionError(`${where}: ${reason}`);
  };
  checkName('Cola', spec.name);
  if (!spec.description.trim()) fail('falta la descripción');

  const fifo = spec.fifo ?? false;
  const visibility =
    spec.visibilityTimeoutSeconds ?? QueueDefaults.visibilityTimeoutSeconds;
  if (
    !isPositiveInt(visibility) ||
    visibility > QueueDefaults.maxVisibilityTimeoutSeconds
  ) {
    fail(
      `visibilityTimeoutSeconds debe ser un entero entre 1 y ${QueueDefaults.maxVisibilityTimeoutSeconds}`,
    );
  }

  const retry = spec.retry ?? QueueDefaults.retry;
  if (
    !isPositiveInt(retry.maxAttempts) ||
    !(retry.baseMs > 0) ||
    !(retry.maxMs >= retry.baseMs)
  ) {
    fail('retry exige maxAttempts entero positivo y 0 < baseMs <= maxMs');
  }

  const maxReceiveCount = spec.deadLetter?.maxReceiveCount ?? retry.maxAttempts;
  if (
    !isPositiveInt(maxReceiveCount) ||
    maxReceiveCount < retry.maxAttempts ||
    maxReceiveCount > QueueDefaults.maxReceiveCount
  ) {
    fail(
      `deadLetter.maxReceiveCount debe estar entre retry.maxAttempts y ${QueueDefaults.maxReceiveCount}`,
    );
  }
  const retentionDays =
    spec.deadLetter?.retentionDays ?? QueueDefaults.deadLetterRetentionDays;
  if (
    !isPositiveInt(retentionDays) ||
    retentionDays > QueueDefaults.maxDeadLetterRetentionDays
  ) {
    fail(
      `deadLetter.retentionDays debe estar entre 1 y ${QueueDefaults.maxDeadLetterRetentionDays}`,
    );
  }

  const commands = [...(spec.commands ?? [])];
  const subscriptions: QueueSubscription[] = [];
  const topics = new Set<string>();
  for (const subscription of spec.subscriptions ?? []) {
    const { topic } = subscription;
    if (topics.has(topic.name)) fail(`suscripción repetida a ${topic.name}`);
    topics.add(topic.name);
    if (topic.fifo && !fifo) {
      fail(`el tópico FIFO ${topic.name} solo entrega a colas FIFO`);
    }
    const events = [...(subscription.events ?? [])];
    for (const event of events) {
      if (!topic.events.includes(event)) {
        fail(`el evento ${event.type} no se publica en ${topic.name}`);
      }
    }
    checkUniqueTypes(`${where} (${topic.name})`, events);
    subscriptions.push(Object.freeze({ topic, events: Object.freeze(events) }));
  }
  if (commands.length === 0 && subscriptions.length === 0) {
    fail('no recibe comandos ni eventos');
  }
  checkUniqueTypes(where, commands);

  return Object.freeze({
    name: spec.name,
    fifo,
    visibilityTimeoutSeconds: visibility,
    retry: Object.freeze({ ...retry }),
    deadLetter: Object.freeze({ maxReceiveCount, retentionDays }),
    commands: Object.freeze(commands),
    subscriptions: Object.freeze(subscriptions),
    description: spec.description,
  });
}

/** Tipos de mensaje que recibe una cola: sus comandos y los eventos suscritos. */
export function deliveredTypes(queue: QueueDefinition): string[] {
  const types = queue.commands.map((c) => c.type);
  for (const subscription of queue.subscriptions) {
    const events =
      subscription.events.length > 0
        ? subscription.events
        : subscription.topic.events;
    types.push(...events.map((e) => e.type));
  }
  return types;
}
