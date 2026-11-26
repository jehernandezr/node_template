import { PlatformErrorCode } from '@contracts/platform';
import { ActorType } from '@platform/observability';
import { FixedClock } from '@platform/kernel/test-utils';
import { ApiKeyEnvironment } from '../api-key-environment.enum.js';
import { ApiKeyFormat } from '../api-key-format.js';
import type { ApiKeyPrincipal } from '../api-key-principal.js';
import { ApiKeyResolver } from '../api-key-resolver.js';
import { CachedApiKeyAuthenticator } from '../cached-api-key-authenticator.js';
import { FakeApiKeyResolver } from '../../__tests__/utils/fake-api-key-resolver.js';
import { InMemoryAuthState } from '../../__tests__/utils/in-memory-auth-state.js';

const PREFIX = 'abcdefgh';
const SECRET = 'a'.repeat(32);
const RAW_LIVE = `sk_live_${PREFIX}_${SECRET}`;
const HASH = ApiKeyFormat.hashSecret(SECRET);
const NOW = new Date('2026-01-15T12:00:00.000Z');
const NOW_SECONDS = NOW.getTime() / 1000;

const principal = (
  overrides: Partial<ApiKeyPrincipal> = {},
): ApiKeyPrincipal => ({
  apiKeyId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f08',
  serviceAccountId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f07',
  tenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f02',
  environment: ApiKeyEnvironment.Live,
  permissions: [],
  ...overrides,
});

/** Resolver that always fails with an error unrelated to authentication. */
class ThrowingApiKeyResolver extends ApiKeyResolver {
  override async resolve(): Promise<ApiKeyPrincipal | undefined> {
    throw new Error('resolver down');
  }
}

describe('CachedApiKeyAuthenticator', () => {
  describe('state lookups', () => {
    it('authenticates from the shared state without calling the resolver', async () => {
      const state = new InMemoryAuthState();
      const resolver = new FakeApiKeyResolver();
      await state.putApiKey(PREFIX, HASH, principal({ permissions: [] }));
      const authenticator = new CachedApiKeyAuthenticator(
        state,
        resolver,
        new FixedClock(NOW),
      );

      const actor = await authenticator.authenticate(RAW_LIVE);

      expect(actor).toEqual({
        kind: ActorType.ServiceAccount,
        serviceAccountId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f07',
        apiKeyId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f08',
        tenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f02',
        permissions: [],
      });
      expect(resolver.resolveCount).toBe(0);
    });

    it('falls back to the resolver when the key is not in the state', async () => {
      const resolver = new FakeApiKeyResolver();
      resolver.set(PREFIX, HASH, principal());
      const authenticator = new CachedApiKeyAuthenticator(
        new InMemoryAuthState(),
        resolver,
        new FixedClock(NOW),
      );

      await expect(authenticator.authenticate(RAW_LIVE)).resolves.toMatchObject(
        {
          apiKeyId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f08',
        },
      );
      expect(resolver.resolveCount).toBe(1);
    });

    it('falls back to the resolver when the state is down', async () => {
      const state = new InMemoryAuthState();
      state.failure = new Error('down');
      const resolver = new FakeApiKeyResolver();
      resolver.set(PREFIX, HASH, principal());
      const authenticator = new CachedApiKeyAuthenticator(
        state,
        resolver,
        new FixedClock(NOW),
      );

      await expect(authenticator.authenticate(RAW_LIVE)).resolves.toMatchObject(
        {
          tenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f02',
        },
      );
      expect(resolver.resolveCount).toBe(1);
    });
  });

  describe('rejections with UNAUTHENTICATED', () => {
    it.each<[string, string, ApiKeyPrincipal | undefined]>([
      ['a wrong secret', `sk_live_${PREFIX}_${'b'.repeat(32)}`, principal()],
      ['an unknown prefix', `sk_live_zzzzzzzz_${SECRET}`, principal()],
      [
        'an environment different from the key',
        RAW_LIVE,
        principal({ environment: ApiKeyEnvironment.Test }),
      ],
      ['an expired key', RAW_LIVE, principal({ expiresAt: NOW_SECONDS })],
      ['a malformed key', 'not-a-key', principal()],
    ])('rejects %s', async (_name, raw, stored) => {
      const resolver = new FakeApiKeyResolver();
      if (stored !== undefined) {
        resolver.set(PREFIX, HASH, stored);
      }
      const authenticator = new CachedApiKeyAuthenticator(
        new InMemoryAuthState(),
        resolver,
        new FixedClock(NOW),
      );

      await expect(authenticator.authenticate(raw)).rejects.toMatchObject({
        code: PlatformErrorCode.AuthUnauthenticated,
      });
    });

    it('accepts a key that expires in the future', async () => {
      const resolver = new FakeApiKeyResolver();
      resolver.set(PREFIX, HASH, principal({ expiresAt: NOW_SECONDS + 60 }));
      const authenticator = new CachedApiKeyAuthenticator(
        new InMemoryAuthState(),
        resolver,
        new FixedClock(NOW),
      );

      await expect(authenticator.authenticate(RAW_LIVE)).resolves.toMatchObject(
        {
          kind: ActorType.ServiceAccount,
        },
      );
    });

    it('reports CIRCUIT_OPEN when the resolver fails with an unexpected error', async () => {
      const authenticator = new CachedApiKeyAuthenticator(
        new InMemoryAuthState(),
        new ThrowingApiKeyResolver(),
        new FixedClock(NOW),
      );

      await expect(authenticator.authenticate(RAW_LIVE)).rejects.toMatchObject({
        code: PlatformErrorCode.ResilienceCircuitOpen,
      });
    });
  });
});
