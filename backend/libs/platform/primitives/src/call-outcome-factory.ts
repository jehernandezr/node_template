import { DomainError, FailureKind } from '@platform/kernel';
import { CallOutcome } from './call-outcome.js';
import type { FailureClassifier } from './failure/failure-classifier.js';

/**
 * Convierte un valor lanzado en un `CallOutcome`. Recibe el clasificador para
 * que cada adaptador sume sus reglas de falla sin tocar este cálculo:
 * - `DomainError` → `business-error` con su código, mensaje y detalles; si es
 *   `retryable`, `transient-failure` (no final, libera el claim de idempotencia).
 * - `Transient` → `transient-failure`.
 * - `Timeout` y `Cancelled` → `uncertain`.
 * - `ProtocolViolation` y el resto de `Permanent` → `protocol-violation`.
 */
export class CallOutcomeFactory {
  constructor(private readonly classifier: FailureClassifier) {}

  fromError(error: unknown): CallOutcome<never> {
    if (error instanceof DomainError) {
      return CallOutcomeFactory.fromDomainError(error);
    }
    const reason = CallOutcomeFactory.reasonOf(error);
    switch (this.classifier.classify(error)) {
      case FailureKind.Transient:
        return CallOutcome.transientFailure(reason, { cause: error });
      case FailureKind.Timeout:
      case FailureKind.Cancelled:
        return CallOutcome.uncertain(reason, error);
      case FailureKind.ProtocolViolation:
      case FailureKind.Permanent:
        return CallOutcome.protocolViolation(
          reason,
          CallOutcomeFactory.textCodeOf(error),
        );
    }
  }

  private static fromDomainError(error: DomainError): CallOutcome<never> {
    if (error.retryable) {
      // Un conflicto reintentable no es un resultado final: no se guarda para idempotencia.
      return CallOutcome.transientFailure(error.code, { cause: error });
    }
    return CallOutcome.businessError(error.code, {
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    });
  }

  /** Motivo legible sin copiar el mensaje del error, que puede traer datos de entrada. */
  private static reasonOf(error: unknown): string {
    const code = CallOutcomeFactory.textCodeOf(error);
    if (code !== undefined && code !== '') {
      return code;
    }
    const name = CallOutcomeFactory.propertyOf(error, 'name');
    return typeof name === 'string' && name !== '' ? name : typeof error;
  }

  private static textCodeOf(error: unknown): string | undefined {
    const code = CallOutcomeFactory.propertyOf(error, 'code');
    return typeof code === 'string' ? code : undefined;
  }

  private static propertyOf(error: unknown, key: 'code' | 'name'): unknown {
    return typeof error === 'object' && error !== null
      ? (error as Record<string, unknown>)[key]
      : undefined;
  }
}
