import { FailureKind } from '@platform/kernel';
import { FailureClassifier } from '@platform/primitives';
import { ValkeyCommandError } from '../valkey-command.error.js';
import { ValkeyErrorCode } from '../valkey-error-code.enum.js';
import { ValkeyErrorTranslator } from '../valkey-error-translator.js';
import { ReplyErrors } from './utils/index.js';

const translator = new ValkeyErrorTranslator();

describe('ValkeyErrorTranslator', () => {
  it.each([
    [
      ReplyErrors.of('LOADING Valkey is loading the dataset in memory'),
      FailureKind.Transient,
    ],
    [
      ReplyErrors.of('READONLY You cannot write against a read only replica.'),
      FailureKind.Transient,
    ],
    [ReplyErrors.of('CLUSTERDOWN The cluster is down'), FailureKind.Transient],
    [
      ReplyErrors.of(
        'WRONGTYPE Operation against a key holding the wrong kind of value',
      ),
      FailureKind.Permanent,
    ],
    [ReplyErrors.of('ERR unknown command'), FailureKind.Permanent],
    [new Error('Command timed out'), FailureKind.Timeout],
    [new Error('Connection is closed.'), FailureKind.Transient],
    [
      Object.assign(new Error('connect ECONNREFUSED'), {
        code: 'ECONNREFUSED',
      }),
      FailureKind.Transient,
    ],
  ])('classifies %p', (error, kind) => {
    expect(translator.kindOf(error)).toBe(kind);
    // El error envuelto lleva la clase, así el breaker de resilience la lee.
    expect(
      new FailureClassifier().classify(
        new ValkeyCommandError('GET', kind, error),
      ),
    ).toBe(kind);
  });

  it('opines through the classifier only about error replies', () => {
    const classifier = new FailureClassifier([translator]);
    expect(
      classifier.classify(
        ReplyErrors.of('BUSY Valkey is busy running a script'),
      ),
    ).toBe(FailureKind.Transient);
    expect(classifier.classify(ReplyErrors.of('ERR syntax error'))).toBe(
      FailureKind.Permanent,
    );
    expect(translator.classify(new Error('Command timed out'))).toBeUndefined();
  });

  it('wraps a client error and names the command, never keys or values', () => {
    const wrapped = translator.translate(new Error('secret-key'), 'GET');
    expect(wrapped).toBeInstanceOf(ValkeyCommandError);
    expect(wrapped.message).toBe('Valkey command GET failed');
    expect(wrapped.code).toBe(ValkeyErrorCode.CommandFailed);
    expect(wrapped.retryable).toBe(true);
    expect(wrapped.cause).toEqual(new Error('secret-key'));
  });

  it('lets a platform error through unchanged', () => {
    const own = new ValkeyCommandError(
      'SET',
      FailureKind.Permanent,
      new Error('x'),
    );
    expect(translator.translate(own, 'GET')).toBe(own);
  });

  it('reads the prefix of an error reply and tells replies from client failures', () => {
    const reply = ReplyErrors.of('NOSCRIPT No matching script.');
    expect(translator.isReplyError(reply)).toBe(true);
    expect(translator.replyPrefix(reply)).toBe('NOSCRIPT');
    expect(translator.isReplyError(new Error('boom'))).toBe(false);
    expect(translator.isReplyError('boom')).toBe(false);
    expect(translator.replyPrefix('plain text')).toBe('plain');
  });
});
