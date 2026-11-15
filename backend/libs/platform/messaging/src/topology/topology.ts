import { MESSAGING_NAME_PATTERN } from '@contracts/platform';
import {
  type MessageDefinition,
  MessageKind,
} from '../contracts/message-contract.js';
import type { QueueDef } from './queue-def.js';
import type { RouteDef } from './route-def.js';
import { TargetKind } from './target-kind.enum.js';
import type { TopicDef } from './topic-def.js';
import { MessagingError } from '../errors/messaging-error.js';
import { MessagingErrorCode } from '../errors/messaging-error-code.enum.js';
import { TopologyError } from '../errors/topology.error.js';

/** Límite superior de la espera de un reintento (12 h), igual que los límites de SQS. */
export const MAX_RETRY_DELAY_MS = 12 * 60 * 60 * 1000;
/** Rango del visibility timeout en segundos (de 1 s a 12 h). */
export const MIN_VISIBILITY_TIMEOUT_SECONDS = 1;
export const MAX_VISIBILITY_TIMEOUT_SECONDS = 12 * 60 * 60;
/** Rango de retención de la cola de errores, en días. */
export const MIN_RETENTION_DAYS = 1;
export const MAX_RETENTION_DAYS = 14;
/** Largo máximo del nombre de una cola, con los sufijos `-dlq` y `.fifo`. */
export const MAX_QUEUE_NAME_LENGTH = 80;

const SECONDS_PER_DAY = 86_400;

/** Los problemas de error vuelven inválida la topología; las advertencias solo se informan. */
export enum TopologySeverity {
  Error = 'error',
  Warning = 'warning',
}

/** Problemas estructurales que detecta {@link Topology.validate}. */
export enum TopologyIssueKind {
  DuplicateTopic = 'duplicate-topic',
  DuplicateQueue = 'duplicate-queue',
  DuplicateRoute = 'duplicate-route',
  UndeclaredRouteTarget = 'undeclared-route-target',
  UndeclaredSubscriptionTopic = 'undeclared-subscription-topic',
  FifoMismatch = 'fifo-mismatch',
  MissingDeadLetter = 'missing-dead-letter',
  DeadLetterBelowMaxAttempts = 'dead-letter-below-max-attempts',
  RetryDelayTooLong = 'retry-delay-too-long',
  InvalidVisibilityTimeout = 'invalid-visibility-timeout',
  InvalidRetention = 'invalid-retention',
  NameTooLong = 'name-too-long',
  UnproducedFilterType = 'unproduced-filter-type',
  RouteWithoutContract = 'route-without-contract',
  /** El contrato de la ruta es un evento enrutado como comando, o al revés. */
  ContractKindMismatch = 'contract-kind-mismatch',
  /** El nombre de un tópico o de una cola no cumple el patrón de nombres de mensajería. */
  InvalidName = 'invalid-name',
  /** Un evento se publica en un tópico sin colas suscritas. */
  NoSubscribers = 'no-subscribers',
}

/** Un problema estructural de la topología. */
export interface TopologyIssue {
  readonly kind: TopologyIssueKind;
  readonly severity: TopologySeverity;
  readonly message: string;
}

/** Opciones de {@link Topology.validate}. */
export interface ValidateOptions {
  /**
   * Contratos de las rutas declaradas con solo el tipo como texto. Cada ruta
   * necesita un contrato, el suyo o uno de estos.
   */
  readonly contracts?: readonly MessageDefinition[];
}

/**
 * Vista JSON de la topología con orden estable. La infraestructura se aprovisiona
 * desde la exportación de contratos (`contracts-export`), no desde este
 * documento; sirve a las pruebas que crean los mismos recursos en LocalStack.
 */
export interface TopologyDocument {
  readonly topics: readonly { readonly name: string; readonly fifo: boolean }[];
  readonly queues: readonly {
    readonly name: string;
    readonly fifo: boolean;
    readonly visibilityTimeoutSeconds: number;
    readonly maxAttempts: number;
    readonly dlq: {
      readonly name: string;
      readonly maxReceiveCount: number;
      readonly retentionSeconds: number;
    };
    readonly subscriptions: readonly {
      readonly topic: string;
      readonly filterTypes: readonly string[];
    }[];
  }[];
  readonly routes: readonly {
    readonly type: string;
    readonly kind: MessageKind;
    readonly target: string;
    readonly targetKind: TargetKind;
  }[];
}

/** Comparación de textos por orden de bytes, para que las exportaciones no dependan del idioma. */
export function compareText(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

/** Tópicos, colas y rutas que indexa una {@link Topology}. */
export interface TopologyParts {
  readonly topics: readonly TopicDef[];
  readonly queues: readonly QueueDef[];
  readonly routes: readonly RouteDef[];
}

function duplicatesOf(names: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) duplicates.add(name);
    seen.add(name);
  }
  return [...duplicates];
}

/**
 * Índice de enrutamiento de solo lectura de un servicio: a dónde va cada tipo de
 * mensaje y cómo reintenta cada cola. Los servicios lo construyen desde sus
 * contratos con `topologyFromContracts`, la misma fuente que lee la exportación
 * de infraestructura, así el enrutamiento en ejecución y los recursos
 * aprovisionados no pueden divergir. Llamar a {@link Topology.assertValid} al
 * arrancar.
 */
export class Topology {
  readonly topics: readonly TopicDef[];
  readonly queues: readonly QueueDef[];
  readonly routes: readonly RouteDef[];
  private readonly routesByType = new Map<string, RouteDef>();
  private readonly queuesByName = new Map<string, QueueDef>();

  constructor(parts: TopologyParts) {
    this.topics = Object.freeze([...parts.topics]);
    this.queues = Object.freeze([...parts.queues]);
    this.routes = Object.freeze([...parts.routes]);
    // Gana la primera declaración; los duplicados los reporta `validate`.
    for (const route of this.routes) {
      if (!this.routesByType.has(route.type)) {
        this.routesByType.set(route.type, route);
      }
    }
    for (const queue of this.queues) {
      if (!this.queuesByName.has(queue.name)) {
        this.queuesByName.set(queue.name, queue);
      }
    }
  }

  /** Devuelve todos los problemas estructurales, de error y de advertencia. */
  validate(options: ValidateOptions = {}): TopologyIssue[] {
    const issues: TopologyIssue[] = [];
    const error = (kind: TopologyIssueKind, message: string) =>
      issues.push({ kind, severity: TopologySeverity.Error, message });
    const warning = (kind: TopologyIssueKind, message: string) =>
      issues.push({ kind, severity: TopologySeverity.Warning, message });

    const topicFifo = new Map<string, boolean>(
      this.topics.map((topic) => [topic.name, topic.fifo]),
    );
    const queueNames = new Set(this.queues.map((queue) => queue.name));
    const routeTypes = new Set(this.routes.map((route) => route.type));

    for (const name of duplicatesOf(this.topics.map((topic) => topic.name))) {
      error(TopologyIssueKind.DuplicateTopic, `duplicate topic "${name}"`);
    }
    for (const name of duplicatesOf(this.queues.map((queue) => queue.name))) {
      error(TopologyIssueKind.DuplicateQueue, `duplicate queue "${name}"`);
    }
    for (const type of duplicatesOf(this.routes.map((route) => route.type))) {
      error(
        TopologyIssueKind.DuplicateRoute,
        `duplicate route for type "${type}"`,
      );
    }

    for (const route of this.routes) {
      const declared =
        route.targetKind === TargetKind.Topic
          ? topicFifo.has(route.target.name)
          : queueNames.has(route.target.name);
      if (!declared) {
        error(
          TopologyIssueKind.UndeclaredRouteTarget,
          `route "${route.type}" targets undeclared ${route.targetKind} "${route.target.name}"`,
        );
      }
    }

    const known = new Map(
      (options.contracts ?? []).map((contract) => [contract.type, contract]),
    );
    for (const route of this.routes) {
      const contract = route.contract ?? known.get(route.type);
      if (!contract) {
        error(
          TopologyIssueKind.RouteWithoutContract,
          `route "${route.type}" has no contract`,
        );
      } else if (contract.kind !== route.kind) {
        error(
          TopologyIssueKind.ContractKindMismatch,
          `route "${route.type}" is a ${route.kind} route but its contract is a ${contract.kind}`,
        );
      }
    }

    for (const def of [...this.topics, ...this.queues]) {
      if (!MESSAGING_NAME_PATTERN.test(def.name)) {
        error(
          TopologyIssueKind.InvalidName,
          `"${def.name}" is not a valid SNS/SQS name (lowercase letters, digits and "-")`,
        );
      }
    }

    for (const queue of this.queues) {
      const suffix = queue.isFifo ? '.fifo' : '';
      const longestName = `${queue.name}-dlq${suffix}`;
      if (longestName.length > MAX_QUEUE_NAME_LENGTH) {
        error(
          TopologyIssueKind.NameTooLong,
          `queue "${queue.name}": "${longestName}" exceeds ${MAX_QUEUE_NAME_LENGTH} characters`,
        );
      }

      const visibility = queue.visibilityTimeoutSeconds;
      if (
        visibility < MIN_VISIBILITY_TIMEOUT_SECONDS ||
        visibility > MAX_VISIBILITY_TIMEOUT_SECONDS
      ) {
        error(
          TopologyIssueKind.InvalidVisibilityTimeout,
          `queue "${queue.name}": visibility timeout ${visibility}s must be between ${MIN_VISIBILITY_TIMEOUT_SECONDS}s and ${MAX_VISIBILITY_TIMEOUT_SECONDS}s`,
        );
      }

      const policy = queue.retryPolicy;
      if (policy.maxMs > MAX_RETRY_DELAY_MS) {
        error(
          TopologyIssueKind.RetryDelayTooLong,
          `queue "${queue.name}": maxMs exceeds 12 hours`,
        );
      }

      const dlq = queue.deadLetterConfig;
      if (dlq === null) {
        error(
          TopologyIssueKind.MissingDeadLetter,
          `queue "${queue.name}" has no dead-letter queue`,
        );
      } else {
        if (dlq.maxReceiveCount < policy.maxAttempts) {
          error(
            TopologyIssueKind.DeadLetterBelowMaxAttempts,
            `queue "${queue.name}": maxReceiveCount ${dlq.maxReceiveCount} is below maxAttempts ${policy.maxAttempts}`,
          );
        }
        if (
          !Number.isInteger(dlq.retentionDays) ||
          dlq.retentionDays < MIN_RETENTION_DAYS ||
          dlq.retentionDays > MAX_RETENTION_DAYS
        ) {
          error(
            TopologyIssueKind.InvalidRetention,
            `queue "${queue.name}": retentionDays ${dlq.retentionDays} must be between ${MIN_RETENTION_DAYS} and ${MAX_RETENTION_DAYS}`,
          );
        }
      }

      for (const subscription of queue.subscriptions) {
        const fifo = topicFifo.get(subscription.topic.name);
        if (fifo === undefined) {
          error(
            TopologyIssueKind.UndeclaredSubscriptionTopic,
            `queue "${queue.name}" subscribes to undeclared topic "${subscription.topic.name}"`,
          );
        } else if (queue.isFifo && !fifo) {
          // Los tópicos FIFO de SNS pueden alimentar colas estándar; una cola FIFO necesita un tópico FIFO.
          error(
            TopologyIssueKind.FifoMismatch,
            `fifo queue "${queue.name}" cannot subscribe to standard topic "${subscription.topic.name}"`,
          );
        }
        for (const type of subscription.filterTypes) {
          if (!routeTypes.has(type)) {
            error(
              TopologyIssueKind.UnproducedFilterType,
              `queue "${queue.name}" filters on type "${type}", which no route produces`,
            );
          }
        }
      }
    }

    for (const route of this.routes) {
      if (
        route.kind !== MessageKind.Event ||
        route.targetKind !== TargetKind.Topic
      )
        continue;
      const subscribed = this.queues.some((queue) =>
        queue.subscriptions.some(
          (subscription) => subscription.topic.name === route.target.name,
        ),
      );
      if (!subscribed) {
        warning(
          TopologyIssueKind.NoSubscribers,
          `event "${route.type}" is published to "${route.target.name}", which has no subscribers`,
        );
      }
    }

    return issues;
  }

  /** Lanza un {@link TopologyError} con cada problema de error. Las advertencias no lanzan. */
  assertValid(options: ValidateOptions = {}): void {
    const errors = this.validate(options).filter(
      (issue) => issue.severity === TopologySeverity.Error,
    );
    if (errors.length > 0) throw new TopologyError(errors);
  }

  /** Devuelve la ruta de un tipo de mensaje, si existe. */
  routeFor(type: string): RouteDef | undefined {
    return this.routesByType.get(type);
  }

  /** Devuelve una cola por nombre, si está declarada. */
  queueFor(name: string): QueueDef | undefined {
    return this.queuesByName.get(name);
  }

  /** Exporta la topología con orden estable. Valida antes. */
  toJSON(): TopologyDocument {
    this.assertValid();

    const byName = (a: { name: string }, b: { name: string }) =>
      compareText(a.name, b.name);

    return {
      topics: [...this.topics]
        .sort(byName)
        .map((topic) => ({ name: topic.name, fifo: topic.fifo })),
      queues: [...this.queues].sort(byName).map((queue) => {
        const dlq = queue.deadLetterConfig;
        if (dlq === null) {
          throw new MessagingError(
            MessagingErrorCode.InvalidTopology,
            `queue "${queue.name}" has no dead-letter queue`,
          );
        }
        return {
          name: queue.name,
          fifo: queue.isFifo,
          visibilityTimeoutSeconds: queue.visibilityTimeoutSeconds,
          maxAttempts: queue.retryPolicy.maxAttempts,
          dlq: {
            name: queue.dlqName,
            maxReceiveCount: dlq.maxReceiveCount,
            retentionSeconds: dlq.retentionDays * SECONDS_PER_DAY,
          },
          subscriptions: queue.subscriptions
            .map((subscription) => ({
              topic: subscription.topic.name,
              filterTypes: [...subscription.filterTypes].sort(compareText),
            }))
            .sort((a, b) => compareText(a.topic, b.topic)),
        };
      }),
      routes: [...this.routes]
        .sort((a, b) => compareText(a.type, b.type))
        .map((route) => ({
          type: route.type,
          kind: route.kind,
          target: route.target.name,
          targetKind: route.targetKind,
        })),
    };
  }
}
