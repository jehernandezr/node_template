import {
  type MessageContract,
  MessageKind,
} from '../contracts/message-contract.js';
import {
  MessagingError,
  MessagingErrorCode,
} from '../errors/messaging-error.js';
import type { QueueDef } from './queue-def.js';
import { type RouteDef, TargetKind } from './route.js';
import type { TopicDef } from './topic-def.js';

/** Upper bound of a retry backoff delay (12 h), matching SQS limits. */
export const MAX_RETRY_DELAY_MS = 12 * 60 * 60 * 1000;
/** Visibility timeout range in seconds (1 s to 12 h). */
export const MIN_VISIBILITY_TIMEOUT_SECONDS = 1;
export const MAX_VISIBILITY_TIMEOUT_SECONDS = 12 * 60 * 60;
/** Dead-letter retention range in days. */
export const MIN_RETENTION_DAYS = 1;
export const MAX_RETENTION_DAYS = 14;
/** Longest queue name including the `-dlq` and `.fifo` suffixes. */
export const MAX_QUEUE_NAME_LENGTH = 80;

const SECONDS_PER_DAY = 86_400;

/** Error issues make the topology invalid; warnings are reported only. */
export enum TopologySeverity {
  Error = 'error',
  Warning = 'warning',
}

/** Structural problems detected by {@link Topology.validate}. */
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
  NoSubscribers = 'no-subscribers',
}

/** One structural problem of a topology. */
export interface TopologyIssue {
  readonly kind: TopologyIssueKind;
  readonly severity: TopologySeverity;
  readonly message: string;
}

/** Options for {@link Topology.validate}. */
export interface ValidateOptions {
  /** When given, every route type must be produced by one of these contracts. */
  readonly contracts?: readonly MessageContract<unknown>[];
}

/** Thrown by {@link Topology.assertValid} with every error issue found. */
export class TopologyError extends MessagingError {
  readonly issues: readonly TopologyIssue[];

  constructor(issues: readonly TopologyIssue[]) {
    super(
      MessagingErrorCode.InvalidTopology,
      `invalid topology: ${issues.map((issue) => issue.message).join('; ')}`,
    );
    this.issues = issues;
  }
}

/** Canonical JSON export of a topology, consumed by Terraform, local setup and docs. */
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

function compare(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
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
 * Single source of truth for routing. Subclass it and declare topics, queues and routes.
 * Use {@link Topology.assertValid} at startup and {@link Topology.toJSON} for the export.
 */
export abstract class Topology {
  abstract readonly topics: readonly TopicDef[];
  abstract readonly queues: readonly QueueDef[];
  abstract readonly routes: readonly RouteDef[];

  /** Returns every structural problem, errors and warnings. */
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

    if (options.contracts) {
      const known = new Set(options.contracts.map((contract) => contract.type));
      for (const route of this.routes) {
        if (!known.has(route.type)) {
          error(
            TopologyIssueKind.RouteWithoutContract,
            `route "${route.type}" has no registered contract`,
          );
        }
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
          // SNS FIFO topics may feed standard queues; a FIFO queue needs a FIFO topic.
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

  /** Throws a {@link TopologyError} listing every error issue. Warnings do not throw. */
  assertValid(options: ValidateOptions = {}): void {
    const errors = this.validate(options).filter(
      (issue) => issue.severity === TopologySeverity.Error,
    );
    if (errors.length > 0) throw new TopologyError(errors);
  }

  /** Returns the route for a message type, if any. */
  routeFor(type: string): RouteDef | undefined {
    return this.routes.find((route) => route.type === type);
  }

  /** Exports the topology with stable ordering. Validates first. */
  toJSON(): TopologyDocument {
    this.assertValid();

    const byName = (a: { name: string }, b: { name: string }) =>
      compare(a.name, b.name);

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
              filterTypes: [...subscription.filterTypes].sort(compare),
            }))
            .sort((a, b) => compare(a.topic, b.topic)),
        };
      }),
      routes: [...this.routes]
        .sort((a, b) => compare(a.type, b.type))
        .map((route) => ({
          type: route.type,
          kind: route.kind,
          target: route.target.name,
          targetKind: route.targetKind,
        })),
    };
  }
}
