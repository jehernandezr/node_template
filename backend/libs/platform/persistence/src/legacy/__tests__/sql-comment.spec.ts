import { ActorType, RequestContext } from '@platform/observability';
import {
  EMPTY_PERSISTENCE_CONTEXT,
  LegacyRequestContext,
} from '../context/persistence-context.js';
import { sqlComment, withSqlComment } from '../sql/sql-comment.js';

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

describe('LegacyRequestContext', () => {
  it('reads trace, tenant, actor and user from RequestContext', () => {
    const context = RequestContext.run(
      {
        traceId: '0193f1c2-0000-7000-8000-00000000c0de',
        spanId: '00f067aa0ba902b7',
        tenantId: 'tenant-1',
        actorId: 'svc-billing',
        actorType: ActorType.ServiceAccount,
        userId: 'user-1',
        debugSampled: false,
      },
      () => LegacyRequestContext.provider(),
    );
    // RequestContext normaliza el traceId al formato W3C de 32 hex.
    expect(context).toEqual({
      traceId: '0193f1c200007000800000000000c0de',
      tenantId: 'tenant-1',
      actorId: 'svc-billing',
      actorType: ActorType.ServiceAccount,
      userId: 'user-1',
    });
  });

  it('is empty outside a request', () => {
    expect(LegacyRequestContext.provider()).toBe(EMPTY_PERSISTENCE_CONTEXT);
  });
});
