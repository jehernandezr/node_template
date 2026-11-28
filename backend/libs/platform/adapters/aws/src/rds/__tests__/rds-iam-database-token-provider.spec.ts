import { FixedClock } from '@platform/kernel/test-utils';
import type { AwsCredentials } from '../../aws-credentials.js';
import { PresignedTokenVerifier } from '../../__tests__/utils/presigned-token-verifier.js';
import { StaticCredentialsProvider } from '../../__tests__/utils/static-credentials-provider.js';
import { RdsIamDatabaseTokenProvider } from '../rds-iam-database-token-provider.js';

const REGION = 'us-east-1';
const credentials: AwsCredentials = {
  accessKeyId: 'test-access-key',
  secretAccessKey: 'test-secret',
};
const temporary: AwsCredentials = {
  ...credentials,
  sessionToken: 'test/session+token=',
};
const request = {
  host: 'nt-dev-proxy.proxy-x.us-east-1.rds.amazonaws.com',
  port: 5432,
  user: 'identity_app',
};
const now = new Date('2026-11-13T10:20:30.123Z');

function providerWith(
  signing: AwsCredentials,
  clock = new FixedClock(now),
): RdsIamDatabaseTokenProvider {
  return new RdsIamDatabaseTokenProvider(
    REGION,
    new StaticCredentialsProvider(signing),
    clock,
  );
}

function paramsOf(token: string): URLSearchParams {
  return new URLSearchParams(token.split('?')[1]);
}

describe('RdsIamDatabaseTokenProvider', () => {
  it('presigns a connect request for the host, port and user, without the scheme', async () => {
    const token = await providerWith(credentials).token(request);
    const params = paramsOf(token);

    expect(token.startsWith(`${request.host}:5432/?`)).toBe(true);
    expect(params.get('Action')).toBe('connect');
    expect(params.get('DBUser')).toBe('identity_app');
    expect(params.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
    expect(params.get('X-Amz-Credential')).toBe(
      'test-access-key/20261113/us-east-1/rds-db/aws4_request',
    );
    expect(params.get('X-Amz-Date')).toBe('20261113T102030Z');
    expect(params.get('X-Amz-Expires')).toBe('900');
    expect(params.get('X-Amz-SignedHeaders')).toBe('host');
  });

  it.each([
    ['long-lived', credentials],
    ['temporary', temporary],
  ])(
    'signs with %s credentials as the SigV4 process of the documentation does',
    async (_kind, signing) => {
      const token = await providerWith(signing).token(request);

      expect(paramsOf(token).get('X-Amz-Signature')).toBe(
        new PresignedTokenVerifier(signing, REGION, 'rds-db').expectedSignature(
          token,
        ),
      );
    },
  );

  it('carries the session token of temporary credentials', async () => {
    const token = await providerWith(temporary).token(request);

    expect(paramsOf(token).get('X-Amz-Security-Token')).toBe(
      'test/session+token=',
    );
    expect(token).toContain('X-Amz-Security-Token=test%2Fsession%2Btoken%3D');
  });

  it('signs a new token for each connection, with the time of that connection', async () => {
    const clock = new FixedClock(now);
    const provider = providerWith(credentials, clock);

    const first = await provider.token(request);
    clock.advance(60_000);
    const second = await provider.token(request);

    expect(paramsOf(second).get('X-Amz-Date')).toBe('20261113T102130Z');
    expect(second).not.toBe(first);
  });

  it('binds the token to the user: a reader token differs from the app token', async () => {
    const provider = providerWith(credentials);

    const app = await provider.token(request);
    const reader = await provider.token({
      ...request,
      user: 'identity_reader',
    });

    expect(paramsOf(reader).get('DBUser')).toBe('identity_reader');
    expect(paramsOf(reader).get('X-Amz-Signature')).not.toBe(
      paramsOf(app).get('X-Amz-Signature'),
    );
  });
});
