import { FixedClock } from '@platform/kernel/test-utils';
import type { AwsCredentials } from '../aws-credentials.js';
import { ElastiCacheIamAuthTokenProvider } from '../elasticache-iam-auth-token-provider.js';
import { StaticCredentialsProvider } from './utils/static-credentials-provider.js';

// Valores de prueba evidentes. Las firmas esperadas salen de `SignatureV4.presign`
// de @smithy/signature-v4 con los mismos datos, así la firma propia queda
// atada a la del SDK.
const credentials: AwsCredentials = {
  accessKeyId: 'test-access-key',
  secretAccessKey: 'test-secret',
};
const temporary: AwsCredentials = {
  ...credentials,
  sessionToken: 'test/session+token=',
};
const identity = {
  userId: 'node-template-dev-identity',
  cacheName: 'node-template-dev-valkey',
};
const now = new Date('2026-11-13T10:20:30.123Z');

function signatureOf(token: string): string | null {
  return new URLSearchParams(token.split('?')[1]).get('X-Amz-Signature');
}

function providerWith(
  signing: AwsCredentials,
  clock: FixedClock,
): ElastiCacheIamAuthTokenProvider {
  return new ElastiCacheIamAuthTokenProvider(
    'us-east-1',
    new StaticCredentialsProvider(signing),
    clock,
  );
}

describe('ElastiCacheIamAuthTokenProvider.sign', () => {
  const provider = providerWith(credentials, new FixedClock(now));

  it.each([
    [
      true,
      credentials,
      '3b5a146e8b270ee593251c2d04216f3892755ab39ae7ea4d8d631c790639a93c',
    ],
    [
      false,
      credentials,
      'c49ef8e5cc0fb0341902455a8d9e7763291e692d6efdaba08f1dcce225b8af4f',
    ],
    [
      true,
      temporary,
      '75fa34d635651e933b63553ed41e8037a74f219a59d63943f388467fdca5a6db',
    ],
    [
      false,
      temporary,
      'f679cabc73007574fdca18d52126f1e128d587b2eb28aa4217eef7d36a9226a9',
    ],
  ])(
    'matches the SDK presigner (serverless %s)',
    (serverless, creds, expected) => {
      const token = provider.sign({ ...identity, serverless }, creds, now);
      expect(signatureOf(token)).toBe(expected);
    },
  );

  it('is the presigned URL without the scheme, valid for 15 minutes', () => {
    const token = provider.sign(
      { ...identity, serverless: true },
      temporary,
      now,
    );

    expect(token).toBe(
      'node-template-dev-valkey/?Action=connect&ResourceType=ServerlessCache' +
        '&User=node-template-dev-identity&X-Amz-Algorithm=AWS4-HMAC-SHA256' +
        '&X-Amz-Credential=test-access-key%2F20261113%2Fus-east-1%2Felasticache%2Faws4_request' +
        '&X-Amz-Date=20261113T102030Z&X-Amz-Expires=900' +
        '&X-Amz-Security-Token=test%2Fsession%2Btoken%3D&X-Amz-SignedHeaders=host' +
        '&X-Amz-Signature=75fa34d635651e933b63553ed41e8037a74f219a59d63943f388467fdca5a6db',
    );
  });
});

describe('ElastiCacheIamAuthTokenProvider.token', () => {
  it('signs with the credentials and the clock of each call', async () => {
    const clock = new FixedClock(now);
    const first = await providerWith(credentials, clock).token({
      ...identity,
      serverless: true,
    });
    clock.advance(60_000);
    const second = await providerWith(temporary, clock).token({
      ...identity,
      serverless: true,
    });

    expect(first).not.toContain('X-Amz-Security-Token');
    expect(second).toContain('X-Amz-Date=20261113T102130Z');
    expect(second).toContain('X-Amz-Security-Token=');
  });
});
