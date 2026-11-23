import { BearerStreamAuthenticator } from '../auth/bearer-stream-authenticator.js';
import { CookieStreamAuthenticator } from '../auth/cookie-stream-authenticator.js';
import {
  RealtimeTestAuth,
  runStreamAuthenticatorContract,
} from './utils/index.js';

runStreamAuthenticatorContract(
  'BearerStreamAuthenticator',
  (auth) => new BearerStreamAuthenticator(auth.verifier),
  (token) => ({ authorization: `Bearer ${token}` }),
);

runStreamAuthenticatorContract(
  'CookieStreamAuthenticator',
  (auth) => new CookieStreamAuthenticator(auth.verifier, 'rt_access'),
  (token) => ({
    cookie: `theme=dark; rt_access=${encodeURIComponent(token)}; lang=es`,
  }),
);

describe('CookieStreamAuthenticator', () => {
  it('ignores the Authorization header: the token must come in its cookie', async () => {
    const auth = await RealtimeTestAuth.create();

    await expect(
      new CookieStreamAuthenticator(auth.verifier, 'rt_access').authenticate({
        authorization: `Bearer ${auth.token()}`,
      }),
    ).rejects.toThrow(/missing stream cookie/);
  });
});
