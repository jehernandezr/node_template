import {
  Compensation,
  PlatformErrorCode,
  type OperationRetryPolicy,
} from '@contracts/platform';
import { BackoffStrategy, RetryPolicy } from '@platform/primitives';

/** Campos con los que se arma un `OperationMetadata`, tomados del descriptor de `defineOperation`. */
export interface OperationMetadataInit {
  readonly id: string;
  readonly idempotent: boolean;
  readonly mutating: boolean;
  readonly errors: readonly string[];
  /** Id de la operación que revierte esta, o `Compensation.None`. */
  readonly compensatedBy?: string | Compensation;
  /** Obligatorio y no vacío cuando `compensatedBy` es `Compensation.None`. */
  readonly compensationReason?: string;
  readonly retry?: OperationRetryPolicy;
  readonly timeoutMs?: number;
}

/**
 * Metadatos inmutables de una operación. Reúne los valores efectivos de
 * reintento, tiempo y compensación para que ni el cliente, ni el registro ni
 * las sagas los recalculen cada uno por su lado.
 */
export class OperationMetadata {
  /** Reintentos de una operación idempotente que no declara los suyos. */
  static readonly DEFAULT_RETRY_POLICY = new RetryPolicy(
    3,
    100,
    2000,
    BackoffStrategy.EqualJitter,
  );

  /** Tiempo de cada intento cuando la operación no declara `timeoutMs`. */
  static readonly DEFAULT_TIMEOUT_MS = 5000;

  /**
   * Código de negocio permitido en toda operación sin declararlo. El cliente y
   * el router responden con él a una entrada que rompe el contrato.
   */
  static readonly INVALID_INPUT_CODE = PlatformErrorCode.ValidationInvalidInput;

  readonly id: string;
  readonly idempotent: boolean;
  readonly mutating: boolean;
  readonly errors: readonly string[];
  readonly compensatedBy?: string | Compensation;
  readonly compensationReason?: string;
  readonly retry?: OperationRetryPolicy;
  readonly timeoutMs?: number;

  constructor(init: OperationMetadataInit) {
    this.id = init.id;
    this.idempotent = init.idempotent;
    this.mutating = init.mutating;
    this.errors = Object.freeze([...init.errors]);
    if (init.compensatedBy !== undefined) {
      this.compensatedBy = init.compensatedBy;
    }
    if (init.compensationReason !== undefined) {
      this.compensationReason = init.compensationReason;
    }
    if (init.retry !== undefined) {
      this.retry = init.retry;
    }
    if (init.timeoutMs !== undefined) {
      this.timeoutMs = init.timeoutMs;
    }
    Object.freeze(this);
  }

  /** Servicio dueño de una operación: el primer segmento de su id (`servicio.entidad.operación.vN`). */
  static serviceOf(operationId: string): string {
    return operationId.split('.')[0];
  }

  /** Servicio dueño de esta operación. */
  service(): string {
    return OperationMetadata.serviceOf(this.id);
  }

  /** Reintentos efectivos: lo declarado por la operación sobre los valores por defecto. */
  retryPolicy(): RetryPolicy {
    const base = OperationMetadata.DEFAULT_RETRY_POLICY;
    return new RetryPolicy(
      this.retry?.maxAttempts ?? base.maxAttempts,
      this.retry?.baseMs ?? base.baseMs,
      this.retry?.maxMs ?? base.maxMs,
      base.strategy,
    );
  }

  /** Tiempo de cada intento. */
  attemptTimeoutMs(): number {
    return this.timeoutMs ?? OperationMetadata.DEFAULT_TIMEOUT_MS;
  }

  /** Intentos que el cliente puede hacer. Una operación no idempotente tiene exactamente uno. */
  attempts(): number {
    return this.idempotent ? Math.max(1, this.retryPolicy().maxAttempts) : 1;
  }

  /**
   * Presupuesto por defecto de una llamada completa: todos los intentos más la
   * espera más larga entre ellos. Se usa cuando quien llama no pasa un `Deadline`.
   */
  callBudgetMs(): number {
    const attempts = this.attempts();
    return (
      attempts * this.attemptTimeoutMs() +
      (attempts - 1) * this.retryPolicy().maxMs
    );
  }

  /**
   * Id de la operación que revierte esta, o `null` si no tiene: una operación
   * de solo lectura o una declarada con `Compensation.None`.
   */
  compensation(): string | null {
    if (!this.mutating || this.compensatedBy === undefined) {
      return null;
    }
    return this.compensatedBy === Compensation.None ? null : this.compensatedBy;
  }

  /** Códigos de negocio que un handler o un transporte puede devolver para esta operación. */
  allowedErrorCodes(): ReadonlySet<string> {
    return new Set([...this.errors, OperationMetadata.INVALID_INPUT_CODE]);
  }
}
