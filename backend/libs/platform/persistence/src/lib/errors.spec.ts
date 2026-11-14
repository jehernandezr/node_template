import { PlatformErrorCode, platformErrorCatalog } from '@contracts/platform';
import { isErrorCode } from '@platform/kernel';
import { classifyFailure, FailureKind } from '@platform/primitives';
import { RequestContext } from '@platform/observability';
import {
  EMPTY_PERSISTENCE_CONTEXT,
  requestContextProvider,
} from './context/persistence-context.js';
import {
  OptimisticLockError,
  PersistenceError,
  toPersistenceError,
} from './errors.js';
import { sqlComment, withSqlComment } from './sql/sql-comment.js';

const persistenceCodes = Object.values(PlatformErrorCode).filter((code) =>
  code.startsWith('PLATFORM.PERSISTENCE.'),
);

describe('errors', () => {
  it('uses well formed codes', () => {
    for (const code of persistenceCodes) {
      expect(isErrorCode(code)).toBe(true);
    }
  });

  it('reports a version mismatch with the catalogued 409 code', () => {
    const error = new OptimisticLockError('tasks', 3);
    expect(error.code).toBe(PlatformErrorCode.ConflictVersionMismatch);
    expect(
      platformErrorCatalog.find((entry) => entry.code === error.code)
        ?.httpStatus,
    ).toBe(409);
    expect(classifyFailure(error)).toBe(FailureKind.Permanent);
  });

  it.each([
    ['40001', FailureKind.Transient],
    ['40P01', FailureKind.Transient],
    ['08006', FailureKind.Transient],
    ['23505', FailureKind.Permanent],
  ])('classifies SQLSTATE %s', (code, kind) => {
    const error = toPersistenceError(
      Object.assign(new Error('driver text with a value'), { code }),
    );
    expect(error).toMatchObject({
      code: PlatformErrorCode.PersistenceQueryFailed,
      failureKind: kind,
      retryable: kind === FailureKind.Transient,
      details: { sqlState: code },
    });
    expect(error.message).not.toContain('value');
    expect(classifyFailure(error)).toBe(kind);
  });

  it('passes platform errors through', () => {
    const original = new OptimisticLockError('tasks', 1);
    expect(toPersistenceError(original)).toBe(original);
  });

  it('fixes the failure kind by code', () => {
    expect(
      new PersistenceError(PlatformErrorCode.PersistenceContention, 'x')
        .retryable,
    ).toBe(true);
    expect(
      new PersistenceError(PlatformErrorCode.PersistenceTenantRequired, 'x')
        .failureKind,
    ).toBe(FailureKind.ProtocolViolation);
  });
});

describe('sql comment', () => {
  it('carries traceId and tenantId', () => {
    expect(
      withSqlComment('SELECT 1', { traceId: 'abc-1', tenantId: 't-1' }),
    ).toBe('/* traceId=abc-1 tenantId=t-1 */ SELECT 1');
    expect(sqlComment({})).toBe('');
  });

  it('cannot be closed or abused by an external value', () => {
    const comment = sqlComment({
      traceId: 'x */ DROP TABLE users; /*',
      tenantId: "t'1",
    });
    expect(comment).toBe('/* traceId=xDROPTABLEusers tenantId=t1 */ ');
    expect(sqlComment({ traceId: 'a'.repeat(500) })).toHaveLength(
      '/* traceId= */ '.length + 64,
    );
  });
});

describe('requestContextProvider', () => {
  it('reads trace, tenant and user from RequestContext', () => {
    const context = RequestContext.run(
      {
        traceId: '0193f1c2-0000-7000-8000-00000000c0de',
        spanId: '00f067aa0ba902b7',
        tenantId: 'tenant-1',
        userId: 'user-1',
        debugSampled: false,
      },
      () => requestContextProvider(),
    );
    // RequestContext normaliza el traceId al formato W3C de 32 hex.
    expect(context).toEqual({
      traceId: '0193f1c200007000800000000000c0de',
      tenantId: 'tenant-1',
      actorId: 'user-1',
      actorType: undefined,
    });
  });

  it('is empty outside a request', () => {
    expect(requestContextProvider()).toBe(EMPTY_PERSISTENCE_CONTEXT);
  });
});
