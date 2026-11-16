import { FailureKind } from '@platform/kernel';
import { MessagingError, MessagingErrorCode } from '@platform/messaging';
import { FailureClassifier } from '@platform/primitives';
import { AwsErrorTranslator } from '../aws-error-translator.js';
import { AwsOperation } from '../aws-operation.enum.js';

function sdkError(name: string, fields: Record<string, unknown>): Error {
  return Object.assign(new Error(name), { name, ...fields });
}

describe('AwsErrorTranslator.classify', () => {
  const translator = new AwsErrorTranslator();

  it.each([
    ['a server fault', sdkError('ServiceUnavailable', { $fault: 'server' })],
    [
      'a throttling hint',
      sdkError('Throttling', { $fault: 'client', $retryable: {} }),
    ],
    ['metadata without a fault', sdkError('Timeout', { $metadata: {} })],
  ])('classifies %s as transient', (_label, error) => {
    expect(translator.classify(error)).toBe(FailureKind.Transient);
  });

  it('classifies a client fault as permanent', () => {
    expect(
      translator.classify(sdkError('AccessDenied', { $fault: 'client' })),
    ).toBe(FailureKind.Permanent);
  });

  it('does not classify a plain error', () => {
    expect(translator.classify(new Error('plain'))).toBeUndefined();
  });
});

describe('AwsErrorTranslator.translate', () => {
  const translator = new AwsErrorTranslator();

  it('wraps an SDK failure as TRANSPORT_FAILED without the body', () => {
    const error = sdkError('AuthorizationErrorException', {
      $fault: 'client',
      message: 'secret-body',
    });
    const translated = translator.translate(
      AwsOperation.Publish,
      error,
      'tasks-events',
    );

    expect(translated).toBeInstanceOf(MessagingError);
    expect(translated).toMatchObject({
      code: MessagingErrorCode.TransportFailed,
      retryable: false,
      message: 'sns:Publish (tasks-events) failed: AuthorizationErrorException',
    });
    expect(translated.message).not.toContain('secret-body');
  });

  it('marks a server failure as retryable', () => {
    const translated = translator.translate(
      AwsOperation.SendMessage,
      sdkError('InternalError', { $fault: 'server' }),
      'reports-work',
    );
    expect(translated).toMatchObject({ retryable: true });
  });

  it('passes a MessagingError through unchanged', () => {
    const original = new MessagingError(
      MessagingErrorCode.InvalidOptions,
      'already translated',
    );
    expect(translator.translate(AwsOperation.Publish, original)).toBe(original);
  });
});

describe('FailureClassifier with AwsErrorTranslator', () => {
  it('uses the translator as a rule for SDK errors', () => {
    const classifier = new FailureClassifier([new AwsErrorTranslator()]);
    expect(
      classifier.classify(sdkError('InternalError', { $fault: 'server' })),
    ).toBe(FailureKind.Transient);
    expect(
      classifier.classify(sdkError('AccessDenied', { $fault: 'client' })),
    ).toBe(FailureKind.Permanent);
  });
});
