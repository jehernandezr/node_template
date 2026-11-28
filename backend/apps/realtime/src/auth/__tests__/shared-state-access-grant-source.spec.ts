import { PlatformErrorCode } from '@contracts/platform';
import { SharedStateAccessGrantSource } from '../shared-state-access-grant-source.js';

describe('SharedStateAccessGrantSource', () => {
  it('reports the auth state as unavailable instead of calling identity', async () => {
    await expect(
      new SharedStateAccessGrantSource().fetch(),
    ).rejects.toMatchObject({
      code: PlatformErrorCode.DependencyUnavailable,
      retryable: true,
    });
  });
});
