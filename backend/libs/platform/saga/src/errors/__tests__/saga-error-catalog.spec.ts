import { PlatformErrorCode } from '@contracts/platform';
import { SagaErrorCode } from '../saga-error-code.enum.js';
import { sagaErrorCatalog } from '../saga-error-catalog.js';

/** Código de `PlatformErrorCode` que equivale a cada código de la saga. */
const PLATFORM_EQUIVALENT: Record<SagaErrorCode, PlatformErrorCode> = {
  [SagaErrorCode.NotFound]: PlatformErrorCode.SagaNotFound,
  [SagaErrorCode.DuplicateSaga]: PlatformErrorCode.SagaDuplicateSaga,
  [SagaErrorCode.UnknownDefinition]: PlatformErrorCode.SagaUnknownDefinition,
  [SagaErrorCode.InvalidDefinition]: PlatformErrorCode.SagaInvalidDefinition,
  [SagaErrorCode.InvalidConfiguration]:
    PlatformErrorCode.SagaInvalidConfiguration,
  [SagaErrorCode.InvalidState]: PlatformErrorCode.SagaInvalidState,
  [SagaErrorCode.MissingCompensation]:
    PlatformErrorCode.SagaMissingCompensation,
  [SagaErrorCode.ConcurrentModification]:
    PlatformErrorCode.SagaConcurrentModification,
  [SagaErrorCode.LeaseNotAcquired]: PlatformErrorCode.SagaLeaseNotAcquired,
  [SagaErrorCode.LeaseLost]: PlatformErrorCode.SagaLeaseLost,
  [SagaErrorCode.TransientFailure]: PlatformErrorCode.SagaTransientFailure,
  [SagaErrorCode.ProtocolViolation]: PlatformErrorCode.SagaProtocolViolation,
  [SagaErrorCode.UncertainOutcome]: PlatformErrorCode.SagaUncertainOutcome,
  [SagaErrorCode.StateUpdateFailed]: PlatformErrorCode.SagaStateUpdateFailed,
  [SagaErrorCode.InputBuildFailed]: PlatformErrorCode.SagaInputBuildFailed,
  [SagaErrorCode.IdempotencyKeyConflict]:
    PlatformErrorCode.SagaIdempotencyKeyConflict,
  [SagaErrorCode.DeadlineExceeded]: PlatformErrorCode.SagaDeadlineExceeded,
};

describe('sagaErrorCatalog', () => {
  it('tiene una entrada por cada código de SagaErrorCode', () => {
    const codes = sagaErrorCatalog.map((entry) => entry.code);

    expect(codes.sort()).toEqual(Object.values(SagaErrorCode).sort());
  });

  it('el valor de cada código es el del PlatformErrorCode equivalente', () => {
    for (const code of Object.values(SagaErrorCode)) {
      expect({ code, value: PLATFORM_EQUIVALENT[code] }).toEqual({
        code,
        value: code,
      });
    }
  });

  it('NotFound responde 404 y los códigos de contención son reintentables', () => {
    const byCode = new Map(
      sagaErrorCatalog.map((entry) => [entry.code, entry]),
    );

    expect(byCode.get(SagaErrorCode.NotFound)?.httpStatus).toBe(404);
    expect(byCode.get(SagaErrorCode.LeaseLost)?.retryable).toBe(true);
    expect(byCode.get(SagaErrorCode.InvalidDefinition)?.retryable).toBe(false);
  });
});
