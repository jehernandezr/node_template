import {
  AccessTokenBuilder,
  InMemoryAuthState,
  TestKeyPair,
} from '@platform/auth/test-utils';
import { ActorType } from '@platform/observability';
import {
  AccessResolver,
  AccessTokenVerifier,
  ApiKeyAuthenticator,
  type AccessGrant,
  type ServiceAccountActor,
} from '@platform/auth';
import { SystemClock } from '@platform/kernel';
import { TokenAudience } from '@contracts/identity';
import { AuthMethod } from '../auth-method.enum.js';
import { RequestAuthenticator } from '../request-authenticator.js';

class NoGrants extends AccessResolver {
  override async resolve(): Promise<AccessGrant> {
    throw new Error('no grants in this test');
  }
}

class StubApiKeys extends ApiKeyAuthenticator {
  readonly seen: string[] = [];

  override async authenticate(rawKey: string): Promise<ServiceAccountActor> {
    this.seen.push(rawKey);
    return {
      kind: ActorType.ServiceAccount,
      serviceAccountId: 'sa',
      apiKeyId: 'key',
      tenantId: 'tenant',
      permissions: [],
    };
  }
}

describe('RequestAuthenticator', () => {
  const keys = TestKeyPair.generate('kid-1');
  const verifier = new AccessTokenVerifier(
    keys.keySource(),
    new InMemoryAuthState(),
    new NoGrants(),
    new SystemClock(),
    'https://identity.test',
  );
  const apiKeys = new StubApiKeys();
  const authenticator = new RequestAuthenticator(
    verifier,
    apiKeys,
    TokenAudience.Api,
  );
  const jwtOnly = [AuthMethod.Jwt];

  it('rejects a request without a bearer credential', async () => {
    await expect(
      authenticator.authenticate(undefined, jwtOnly),
    ).rejects.toMatchObject({
      code: 'PLATFORM.AUTH.UNAUTHENTICATED',
      message: 'Unauthenticated: missing credentials',
    });
  });

  it('rejects a session token even if the route allows every method', async () => {
    await expect(
      authenticator.authenticate('Bearer st1_abc', [
        AuthMethod.Jwt,
        AuthMethod.ApiKey,
      ]),
    ).rejects.toMatchObject({
      message: 'Unauthenticated: session token not accepted',
    });
  });

  it('rejects an API key on a route that only takes JWT', async () => {
    await expect(
      authenticator.authenticate('Bearer sk_test_abc', jwtOnly),
    ).rejects.toMatchObject({
      message: 'Unauthenticated: api key not accepted',
    });
    expect(apiKeys.seen).toEqual([]);
  });

  it('authenticates an API key on a route that accepts it', async () => {
    const actor = await authenticator.authenticate('Bearer sk_test_abc', [
      AuthMethod.ApiKey,
    ]);

    expect(actor).toMatchObject({
      kind: ActorType.ServiceAccount,
      tenantId: 'tenant',
    });
    expect(apiKeys.seen).toEqual(['sk_test_abc']);
  });

  it('rejects a JWT on a route that does not take it', async () => {
    await expect(
      authenticator.authenticate('Bearer eyJ.x.y', [AuthMethod.ApiKey]),
    ).rejects.toMatchObject({
      message: 'Unauthenticated: access token not accepted',
    });
  });

  it('verifies a JWT with the audience of the service', async () => {
    const token = AccessTokenBuilder.aToken(
      Math.floor(Date.now() / 1000),
    ).withClaims({
      aud: TokenAudience.Backoffice,
    });

    await expect(
      authenticator.authenticate(`Bearer ${token.sign(keys)}`, jwtOnly),
    ).rejects.toMatchObject({ code: 'PLATFORM.AUTH.UNAUTHENTICATED' });
  });
});
