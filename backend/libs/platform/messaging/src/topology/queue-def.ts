import { BackoffStrategy, RetryPolicy } from '@platform/primitives';
import { MessagingError } from '../errors/messaging-error.js';
import type { TopicDef } from './topic-def.js';
import { MessagingErrorCode } from '../errors/messaging-error-code.enum.js';

/** Suscripción de una cola a un tópico. Una lista de tipos vacía entrega todos los tipos. */
export interface Subscription {
  readonly topic: TopicDef;
  readonly filterTypes: readonly string[];
}

/** Opciones de {@link QueueDef.subscribesTo}. */
export interface SubscriptionOptions {
  /** Tipos de mensaje a entregar; si se omite o está vacía, entran todos los del tópico. */
  readonly types?: readonly string[];
}

/** Opciones de {@link QueueDef.deadLetter}. Toda cola necesita su cola de errores. */
export interface DeadLetterOptions {
  /** Recepciones tras las cuales el mensaje pasa a la cola de errores. Debe ser al menos los intentos de reintento. */
  readonly maxReceiveCount: number;
  /** Entre 1 y 14. Por defecto, 14. */
  readonly retentionDays?: number;
}

/** Configuración resuelta de la cola de errores de una cola. */
export interface DeadLetterConfig {
  readonly maxReceiveCount: number;
  readonly retentionDays: number;
}

const DEFAULT_VISIBILITY_TIMEOUT_SECONDS = 30;
const DEFAULT_DLQ_RETENTION_DAYS = 14;

/** Política de reintento de las colas que no llaman a `retry()`. */
export const DEFAULT_RETRY_POLICY = new RetryPolicy(
  5,
  1_000,
  300_000,
  BackoffStrategy.FullJitter,
);

/** Declara una cola con sus suscripciones, reintentos y cola de errores. API fluida. */
export class QueueDef {
  readonly name: string;

  private fifoEnabled = false;
  private visibilitySeconds = DEFAULT_VISIBILITY_TIMEOUT_SECONDS;
  private policy: RetryPolicy | null = null;
  private dlq: DeadLetterConfig | null = null;
  private readonly subs: Subscription[] = [];

  constructor(name: string) {
    this.name = name;
  }

  /** Suscribe la cola a un tópico, opcionalmente solo para algunos tipos de mensaje. */
  subscribesTo(topic: TopicDef, options: SubscriptionOptions = {}): this {
    this.subs.push({ topic, filterTypes: [...(options.types ?? [])] });
    return this;
  }

  /** Fija la política de reintento que se usa cuando un manejador falla de forma transitoria. */
  retry(policy: RetryPolicy): this {
    this.policy = policy;
    return this;
  }

  /** Configura la cola de errores (`<nombre>-dlq`). */
  deadLetter(options: DeadLetterOptions): this {
    if (
      !Number.isInteger(options.maxReceiveCount) ||
      options.maxReceiveCount < 1
    ) {
      throw new MessagingError(
        MessagingErrorCode.InvalidTopology,
        `queue "${this.name}": maxReceiveCount must be an integer >= 1`,
      );
    }
    this.dlq = {
      maxReceiveCount: options.maxReceiveCount,
      retentionDays: options.retentionDays ?? DEFAULT_DLQ_RETENTION_DAYS,
    };
    return this;
  }

  /** Marca la cola como ordenada (FIFO). */
  fifo(): this {
    this.fifoEnabled = true;
    return this;
  }

  /** Fija el visibility timeout en segundos. El rango lo revisa la validación de la topología. */
  visibilityTimeout(seconds: number): this {
    if (!(seconds > 0) || !Number.isFinite(seconds)) {
      throw new MessagingError(
        MessagingErrorCode.InvalidTopology,
        `queue "${this.name}": visibility timeout must be > 0 seconds`,
      );
    }
    this.visibilitySeconds = seconds;
    return this;
  }

  get isFifo(): boolean {
    return this.fifoEnabled;
  }

  get visibilityTimeoutSeconds(): number {
    return this.visibilitySeconds;
  }

  /** Política explícita, o {@link DEFAULT_RETRY_POLICY} si no se fijó ninguna. */
  get retryPolicy(): RetryPolicy {
    return this.policy ?? DEFAULT_RETRY_POLICY;
  }

  /** Configuración de la cola de errores, o `null` si falta (error de validación). */
  get deadLetterConfig(): DeadLetterConfig | null {
    return this.dlq;
  }

  /** Nombre de la cola de errores, antes de tratar el sufijo `.fifo`. */
  get dlqName(): string {
    return `${this.name}-dlq`;
  }

  get subscriptions(): readonly Subscription[] {
    return this.subs;
  }
}
