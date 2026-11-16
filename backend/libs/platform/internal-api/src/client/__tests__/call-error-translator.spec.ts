import { ResilienceTimeoutError, TimeoutScope } from '@platform/resilience';
import {
  CallOutcome,
  CallOutcomeFactory,
  FailureClassifier,
  type CallOutcome as Outcome,
} from '@platform/primitives';
import { InternalApiReason } from '../../contract/internal-api-reason.enum.js';
import { InternalApiError } from '../../errors/internal-api-error.js';
import { InternalApiErrorCode } from '../../errors/internal-api-error-code.enum.js';
import { CallErrorTranslator } from '../call-error-translator.js';
import { RetryableOutcomeError } from '../retryable-outcome.error.js';

function translator(): CallErrorTranslator {
  return new CallErrorTranslator(
    new CallOutcomeFactory(new FailureClassifier()),
  );
}

function abortedSignal(): AbortSignal {
  return AbortSignal.abort();
}

describe('CallErrorTranslator', () => {
  it.each<
    [
      string,
      unknown,
      { started: boolean; signal?: AbortSignal },
      Outcome<unknown>,
    ]
  >([
    [
      'a retryable transient outcome',
      new RetryableOutcomeError(CallOutcome.transientFailure('busy')),
      { started: true },
      CallOutcome.transientFailure('busy'),
    ],
    [
      'a retryable uncertain outcome',
      new RetryableOutcomeError(CallOutcome.uncertain('http-504')),
      { started: true },
      CallOutcome.uncertain('http-504'),
    ],
    [
      'an aborted signal before sending',
      new Error('aborted'),
      { started: false, signal: abortedSignal() },
      CallOutcome.transientFailure(InternalApiReason.Cancelled),
    ],
    [
      'an aborted signal after sending',
      new Error('aborted'),
      { started: true, signal: abortedSignal() },
      CallOutcome.uncertain(InternalApiReason.Cancelled),
    ],
    [
      'an attempt timeout',
      new ResilienceTimeoutError('external-api', TimeoutScope.Attempt, 100),
      { started: true },
      CallOutcome.uncertain(InternalApiReason.Timeout),
    ],
    [
      'a total timeout after sending',
      new ResilienceTimeoutError('external-api', TimeoutScope.Total, 100),
      { started: true },
      CallOutcome.uncertain(InternalApiReason.Timeout),
    ],
    [
      'a total timeout before sending',
      new ResilienceTimeoutError('external-api', TimeoutScope.Total, 100),
      { started: false },
      CallOutcome.transientFailure(InternalApiReason.DeadlineExceeded),
    ],
    [
      'a domain error of the internal API',
      new InternalApiError(InternalApiErrorCode.UnknownOperation, 'Unknown'),
      { started: false },
      CallOutcome.protocolViolation(
        InternalApiErrorCode.UnknownOperation,
        InternalApiErrorCode.UnknownOperation,
      ),
    ],
  ])('translates %s', (_label, error, context, expected) => {
    expect(translator().translate(error, context)).toEqual(expected);
  });
});
