import { InternalApiErrorCode } from '../../errors/internal-api-error-code.enum.js';
import { InternalCallAuthenticator } from '../internal-call-authenticator.js';
import { DenyAllInternalCallAuthenticator } from '../deny-all-internal-call-authenticator.js';

describe('DenyAllInternalCallAuthenticator', () => {
  it('rejects every call as unauthenticated', async () => {
    const authenticator: InternalCallAuthenticator =
      new DenyAllInternalCallAuthenticator();

    await expect(
      authenticator.authenticate({
        method: 'POST',
        path: '/internal/operations/billing.invoices.create.v1',
        body: {},
        headers: {},
      }),
    ).rejects.toMatchObject({ code: InternalApiErrorCode.Unauthenticated });
  });
});
