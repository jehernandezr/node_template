import type { ApiKeyResolver } from '../api-key-resolver.js';
import { RejectingApiKeyResolver } from '../rejecting-api-key-resolver.js';

describe('RejectingApiKeyResolver', () => {
  it('resolves every key to undefined', async () => {
    const resolver: ApiKeyResolver = new RejectingApiKeyResolver();

    await expect(resolver.resolve('abcdefgh', 'hash')).resolves.toBeUndefined();
  });
});
