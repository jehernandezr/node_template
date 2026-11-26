import { KernelModule } from '@platform/kernel/nest';
import 'reflect-metadata';
import { Test, type TestingModule } from '@nestjs/testing';
import { RevocationReason } from '@contracts/identity';
import { PlatformErrorCode } from '@contracts/platform';
import { ConfigErrorCode } from '@platform/config';
import { ConfigModule } from '@platform/config/nest';
import { ScheduledJob } from '@platform/kernel';
import { AuthModule } from '../auth.module.js';
import { AccessEvaluator } from '../../access/access-evaluator.js';
import { AccessResolver } from '../../access/access-resolver.js';
import { CachedAccessResolver } from '../../access/cached-access-resolver.js';
import { ApiKeyAuthenticator } from '../../api-keys/api-key-authenticator.js';
import { CachedApiKeyAuthenticator } from '../../api-keys/cached-api-key-authenticator.js';
import { JwksKeySource } from '../../jwks/jwks-key-source.js';
import { RemoteJwksKeySource } from '../../jwks/remote-jwks-key-source.js';
import { InMemoryAuthState } from '../../__tests__/utils/in-memory-auth-state.js';
import { FakeApiKeyResolver } from '../../__tests__/utils/fake-api-key-resolver.js';
import { ApiKeyResolver } from '../../api-keys/api-key-resolver.js';
import { FakeAccessGrantSource } from '../../__tests__/utils/fake-access-grant-source.js';
import { CachedAuthStateReader } from '../../state/cached-auth-state-reader.js';
import { AuthStateReader } from '../../state/auth-state-reader.js';
import { AccessTokenVerifier } from '../../verifier/access-token-verifier.js';
import { RevokedSessionsRebuildJob } from '../../jobs/revoked-sessions-rebuild-job.js';
import { AuthTestInfra, StaticKeys } from './utils/auth-test-infra.module.js';

const ISSUER = 'https://identity.test';
const JWKS_URL = 'https://identity.test/.well-known/jwks.json';
const VALID_KEY = `sk_live_abcd1234_${'a'.repeat(32)}`;

describe('AuthModule', () => {
  let apps: TestingModule[];

  beforeEach(() => {
    apps = [];
  });

  afterEach(async () => {
    for (const app of apps) {
      await app.close();
    }
  });

  function testingModule(
    env: Record<string, string> = { AUTH_ISSUER: ISSUER },
    options: Parameters<typeof AuthModule.forRoot>[0] = {
      source: InMemoryAuthState,
      feed: InMemoryAuthState,
      accessGrants: FakeAccessGrantSource,
      jwks: StaticKeys,
    },
  ) {
    return Test.createTestingModule({
      imports: [
        KernelModule,
        ConfigModule.forRoot({ env }),
        AuthTestInfra,
        AuthModule.forRoot(options),
      ],
    });
  }

  async function appWith(
    env?: Record<string, string>,
    options?: Parameters<typeof AuthModule.forRoot>[0],
  ): Promise<TestingModule> {
    const app = await testingModule(env, options).compile();
    apps.push(app);
    return app;
  }

  describe('providers', () => {
    it('resolves the verifier, the cached resolvers and the rebuild job', async () => {
      const app = await appWith();

      expect(app.get(AccessTokenVerifier)).toBeInstanceOf(AccessTokenVerifier);
      expect(app.get(AuthStateReader)).toBeInstanceOf(CachedAuthStateReader);
      expect(app.get(AccessResolver)).toBeInstanceOf(CachedAccessResolver);
      expect(app.get(ApiKeyAuthenticator)).toBeInstanceOf(
        CachedApiKeyAuthenticator,
      );
      expect(app.get(AccessEvaluator)).toBeInstanceOf(AccessEvaluator);
      expect(app.get(JwksKeySource)).toBeInstanceOf(StaticKeys);
      const job = app.get(RevokedSessionsRebuildJob);
      expect(job).toBeInstanceOf(ScheduledJob);
      expect(job.exclusive).toBe(false);
    });

    it('rejects an API key when no api key resolver is configured', async () => {
      const app = await appWith();
      const authenticator = app.get(ApiKeyAuthenticator);

      await expect(authenticator.authenticate(VALID_KEY)).rejects.toMatchObject(
        { code: PlatformErrorCode.AuthUnauthenticated },
      );
    });

    it('provides the API key resolver the service passes', async () => {
      const app = await appWith(undefined, {
        source: InMemoryAuthState,
        feed: InMemoryAuthState,
        accessGrants: FakeAccessGrantSource,
        apiKeyResolver: FakeApiKeyResolver,
        jwks: StaticKeys,
      });

      expect(app.get(ApiKeyResolver)).toBeInstanceOf(FakeApiKeyResolver);
    });

    it('uses the remote key source when the service passes no keys and the JWKS url is set', async () => {
      const app = await appWith(
        { AUTH_ISSUER: ISSUER, AUTH_JWKS_URL: JWKS_URL },
        {
          source: InMemoryAuthState,
          feed: InMemoryAuthState,
          accessGrants: FakeAccessGrantSource,
        },
      );

      expect(app.get(JwksKeySource)).toBeInstanceOf(RemoteJwksKeySource);
    });
  });

  describe('configuration errors', () => {
    it.each([
      [{ feed: InMemoryAuthState, accessGrants: FakeAccessGrantSource }],
      [{ source: InMemoryAuthState, accessGrants: FakeAccessGrantSource }],
      [{ source: InMemoryAuthState, feed: InMemoryAuthState }],
    ])('forRoot rejects a missing adapter: %j', (options) => {
      expect(() => AuthModule.forRoot(options)).toThrow(
        expect.objectContaining({ code: ConfigErrorCode.Invalid }),
      );
    });

    it('rejects compilation when no keys are given and no JWKS url is configured', async () => {
      const module = testingModule(
        { AUTH_ISSUER: ISSUER },
        {
          source: InMemoryAuthState,
          feed: InMemoryAuthState,
          accessGrants: FakeAccessGrantSource,
        },
      );

      await expect(module.compile()).rejects.toMatchObject({
        code: ConfigErrorCode.Invalid,
      });
    });
  });

  describe('bootstrap', () => {
    it('answers revocations from the filter once the app has started', async () => {
      const app = await appWith();
      const state = app.get(InMemoryAuthState);
      await state.revokeSession('s-old', 60_000, RevocationReason.Logout);
      await app.init();
      const reader = app.get(AuthStateReader);

      expect(await reader.isSessionRevoked('s-old')).toBe(true);
      expect(await reader.isSessionRevoked('s-other')).toBe(false);
      expect(state.count('isSessionRevoked')).toBe(1);
    });

    it('reflects a revocation published after the start right away', async () => {
      const app = await appWith();
      await app.init();
      const state = app.get(InMemoryAuthState);
      const reader = app.get(AuthStateReader);

      await state.revokeSession('s-new', 60_000, RevocationReason.Logout);

      expect(await reader.isSessionRevoked('s-new')).toBe(true);
    });
  });
});
