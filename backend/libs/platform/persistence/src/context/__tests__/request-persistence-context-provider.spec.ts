import {
  ActorType,
  RequestContextStore,
  Redactor,
  Tracing,
} from '@platform/observability';
import { RequestPersistenceContextProvider } from '../request-persistence-context-provider.js';

const TENANT_ID = '01941f29-7c00-7000-8000-000000000001';
const USER_ID = 'user-1';
const TRACE_ID = '0193f1c2-0000-7000-8000-00000000c0de';

describe('RequestPersistenceContextProvider', () => {
  describe('inside a request context', () => {
    it('copies the tenant, user, actor and normalized trace', () => {
      const store = new RequestContextStore(new Tracing(new Redactor()));
      const provider = new RequestPersistenceContextProvider(store);

      const seen = store.run(
        {
          tenantId: TENANT_ID,
          actorId: USER_ID,
          actorType: ActorType.User,
          userId: USER_ID,
          traceId: TRACE_ID,
        },
        () => ({
          context: provider.current(),
          trace: store.current()?.traceId,
        }),
      );

      expect(seen.context).toMatchObject({
        tenantId: TENANT_ID,
        userId: USER_ID,
        actorId: USER_ID,
        actorType: ActorType.User,
        traceId: expect.stringMatching(/^[0-9a-f]{32}$/),
      });
      expect(seen.context.traceId).toBe(seen.trace);
    });
  });

  describe('outside a request context', () => {
    it('returns an empty context', () => {
      const store = new RequestContextStore(new Tracing(new Redactor()));

      expect(new RequestPersistenceContextProvider(store).current()).toEqual(
        {},
      );
    });
  });
});
