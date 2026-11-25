import { IdentityCommand } from '@contracts/identity';
import { InMemoryTransactionManager } from '@platform/messaging/test-utils';
import {
  RecordingMessageBus,
  StaticAppConfig,
  TestShardScopes,
} from '../../../../__tests__/utils/index.js';
import { IdentitySettings } from '../../../../config/identity-settings.js';
import { RequestPasswordReset } from '../request-password-reset.use-case.js';

const DEFAULT_TENANT = '01941f29-7c00-7000-8000-0000000000d0';

/** The use case over a recording bus, with the default tenant of the region. */
class RequestHarness {
  readonly bus = new RecordingMessageBus();
  readonly request = new RequestPasswordReset(
    new IdentitySettings(
      new StaticAppConfig({ IDENTITY_DEFAULT_TENANT_ID: DEFAULT_TENANT }),
    ),
    TestShardScopes.create(),
    new InMemoryTransactionManager(),
    this.bus,
  );
}

describe('RequestPasswordReset', () => {
  describe('a request for any email', () => {
    it('only queues the request for the worker, in the default tenant', async () => {
      const harness = new RequestHarness();

      await harness.request.execute('ana@example.com');

      expect(harness.bus.sent).toEqual([
        {
          type: IdentityCommand.SendPasswordReset,
          data: { email: 'ana@example.com' },
          tenantId: DEFAULT_TENANT,
        },
      ]);
      expect(harness.bus.published).toEqual([]);
    });
  });
});
