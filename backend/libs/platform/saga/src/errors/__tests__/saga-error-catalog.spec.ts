import { SagaErrorCode } from '../saga-error-code.enum.js';
import { sagaErrorCatalog } from '../saga-error-catalog.js';

/** Stable text of each code, which the front and clients already know. */
const EXPECTED_CODES: Record<SagaErrorCode, string> = {
  [SagaErrorCode.NotFound]: 'PLATFORM.SAGA.NOT_FOUND',
  [SagaErrorCode.DuplicateSaga]: 'PLATFORM.SAGA.DUPLICATE_SAGA',
  [SagaErrorCode.UnknownDefinition]: 'PLATFORM.SAGA.UNKNOWN_DEFINITION',
  [SagaErrorCode.InvalidDefinition]: 'PLATFORM.SAGA.INVALID_DEFINITION',
  [SagaErrorCode.InvalidConfiguration]: 'PLATFORM.SAGA.INVALID_CONFIGURATION',
  [SagaErrorCode.InvalidState]: 'PLATFORM.SAGA.INVALID_STATE',
  [SagaErrorCode.MissingCompensation]: 'PLATFORM.SAGA.MISSING_COMPENSATION',
  [SagaErrorCode.ConcurrentModification]:
    'PLATFORM.SAGA.CONCURRENT_MODIFICATION',
  [SagaErrorCode.LeaseNotAcquired]: 'PLATFORM.SAGA.LEASE_NOT_ACQUIRED',
  [SagaErrorCode.LeaseLost]: 'PLATFORM.SAGA.LEASE_LOST',
  [SagaErrorCode.TransientFailure]: 'PLATFORM.SAGA.TRANSIENT_FAILURE',
  [SagaErrorCode.ProtocolViolation]: 'PLATFORM.SAGA.PROTOCOL_VIOLATION',
  [SagaErrorCode.UncertainOutcome]: 'PLATFORM.SAGA.UNCERTAIN_OUTCOME',
  [SagaErrorCode.StateUpdateFailed]: 'PLATFORM.SAGA.STATE_UPDATE_FAILED',
  [SagaErrorCode.InputBuildFailed]: 'PLATFORM.SAGA.INPUT_BUILD_FAILED',
  [SagaErrorCode.IdempotencyKeyConflict]:
    'PLATFORM.SAGA.IDEMPOTENCY_KEY_CONFLICT',
  [SagaErrorCode.DeadlineExceeded]: 'PLATFORM.SAGA.DEADLINE_EXCEEDED',
};

describe('sagaErrorCatalog', () => {
  it('tiene una entrada por cada código de SagaErrorCode', () => {
    const codes = sagaErrorCatalog.map((entry) => entry.code);

    expect(codes.sort()).toEqual(Object.values(SagaErrorCode).sort());
  });

  it.each(Object.values(SagaErrorCode))(
    'mantiene el texto estable de %s',
    (code) => {
      expect(code).toBe(EXPECTED_CODES[code]);
    },
  );

  it('NotFound responde 404 y los códigos de contención son reintentables', () => {
    const byCode = new Map(
      sagaErrorCatalog.map((entry) => [entry.code, entry]),
    );

    expect(byCode.get(SagaErrorCode.NotFound)?.httpStatus).toBe(404);
    expect(byCode.get(SagaErrorCode.LeaseLost)?.retryable).toBe(true);
    expect(byCode.get(SagaErrorCode.InvalidDefinition)?.retryable).toBe(false);
  });
});
