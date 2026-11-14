import { FixedClock } from '@platform/kernel/testing';
import {
  elastiCacheIamAuthToken,
  signElastiCacheIamToken,
} from './elasticache-iam-auth.js';

// Valores de prueba evidentes. Las firmas esperadas salen de `SignatureV4.presign`
// de @smithy/signature-v4 con los mismos datos, así la firma propia queda
// atada a la del SDK.
const credentials = {
  accessKeyId: 'test-access-key',
  secretAccessKey: 'test-secret',
};
const temporary = { ...credentials, sessionToken: 'test/session+token=' };
const target = {
  region: 'us-east-1',
  cacheName: 'node-template-dev-valkey',
  userId: 'node-template-dev-identity',
};
const now = new Date('2026-11-13T10:20:30.123Z');

function signatureOf(token: string): string | null {
  return new URLSearchParams(token.split('?')[1]).get('X-Amz-Signature');
}

describe('signElastiCacheIamToken', () => {
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
      const token = signElastiCacheIamToken(
        creds,
        { ...target, serverless },
        now,
      );
      expect(signatureOf(token)).toBe(expected);
    },
  );

  it('is the presigned URL without the scheme, valid for 15 minutes', () => {
    const token = signElastiCacheIamToken(
      temporary,
      { ...target, serverless: true },
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

describe('elastiCacheIamAuthToken', () => {
  it('reads fresh credentials and the clock on every call', async () => {
    const clock = new FixedClock(now);
    const provider = jest
      .fn()
      .mockResolvedValueOnce(credentials)
      .mockResolvedValueOnce(temporary);
    const token = elastiCacheIamAuthToken({
      ...target,
      serverless: true,
      credentials: provider,
      clock,
    });

    const first = await token();
    clock.advance(60_000);
    const second = await token();

    expect(provider).toHaveBeenCalledTimes(2);
    expect(first).not.toContain('X-Amz-Security-Token');
    expect(second).toContain('X-Amz-Date=20261113T102130Z');
    expect(second).toContain('X-Amz-Security-Token=');
  });
});
