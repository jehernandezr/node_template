import {
  InternalApiError,
  InternalApiErrorCode,
  type SignableRequest,
} from '@platform/internal-api';
import { FixedClock } from '@platform/kernel/test-utils';
import {
  CountingCredentialsProvider,
  StaticCredentialsProvider,
} from '../../__tests__/utils/index.js';
import { SigV4Service } from '../sigv4-service.enum.js';
import { SigV4Signer } from '../sigv4-signer.js';
import type { AwsCredentialsProvider } from '../../aws-credentials-provider.js';

const ACCESS_KEY_ID = 'test-access-key-id';
const SECRET_ACCESS_KEY = 'test-secret-access-key';
const BASE_URL = 'https://svc.internal.example.test';
const PATH = '/internal/operations/billing.invoices.create.v1';

function request(overrides: Partial<SignableRequest> = {}): SignableRequest {
  return {
    method: 'POST',
    path: PATH,
    baseUrl: BASE_URL,
    body: { input: { amount: 1 } },
    headers: { 'x-tenant-id': 'tenant-1' },
    ...overrides,
  };
}

describe('SigV4Signer', () => {
  const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));

  function signerWith(
    credentials: AwsCredentialsProvider = new StaticCredentialsProvider({
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    }),
    service = SigV4Service.ExecuteApi,
  ): SigV4Signer {
    return new SigV4Signer(
      { region: 'us-east-1', service },
      credentials,
      clock,
    );
  }

  it('scopes the authorization to the access key, date, region and service', async () => {
    const headers = await signerWith().sign(request());

    expect(headers['authorization']).toMatch(
      new RegExp(
        `^AWS4-HMAC-SHA256 Credential=${ACCESS_KEY_ID}/20260101/us-east-1/execute-api/aws4_request`,
      ),
    );
  });

  it('signs the host, x-amz-date and the request headers', async () => {
    const headers = await signerWith().sign(request());

    expect(headers['authorization']).toMatch(
      /SignedHeaders=[^,]*\bhost\b[^,]*/,
    );
    expect(headers['authorization']).toMatch(
      /SignedHeaders=[^,]*\bx-amz-date\b/,
    );
    expect(headers['authorization']).toMatch(
      /SignedHeaders=[^,]*\bx-tenant-id\b/,
    );
  });

  it('sends x-amz-date in the basic ISO 8601 form of the clock', async () => {
    const headers = await signerWith().sign(request());

    expect(headers['x-amz-date']).toBe('20260101T000000Z');
  });

  it('omits x-amz-security-token when the credentials have no session token', async () => {
    const headers = await signerWith().sign(request());

    expect(headers).not.toHaveProperty('x-amz-security-token');
  });

  it('sends x-amz-security-token when the credentials carry a session token', async () => {
    const headers = await signerWith(
      new StaticCredentialsProvider({
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
        sessionToken: 'test-session-token',
      }),
    ).sign(request());

    expect(headers['x-amz-security-token']).toBe('test-session-token');
  });

  it('does not return the host or the headers of the request', async () => {
    const headers = await signerWith().sign(request());

    expect(headers).not.toHaveProperty('host');
    expect(headers).not.toHaveProperty('x-tenant-id');
  });

  it('rejects a request without baseUrl with InvalidConfiguration', async () => {
    await expect(
      signerWith().sign(request({ baseUrl: undefined })),
    ).rejects.toMatchObject({
      code: InternalApiErrorCode.InvalidConfiguration,
    });
    await expect(
      signerWith().sign(request({ baseUrl: undefined })),
    ).rejects.toBeInstanceOf(InternalApiError);
  });

  it('signs the host with its port', async () => {
    const withPort = await signerWith().sign(
      request({ baseUrl: 'https://svc.internal.example.test:8443' }),
    );
    const withoutPort = await signerWith().sign(request());

    expect(withPort['authorization']).not.toBe(withoutPort['authorization']);
  });

  it('changes the content hash and the authorization when the body changes', async () => {
    const original = await signerWith().sign(request());
    const altered = await signerWith().sign(
      request({ body: { input: { amount: 2 } } }),
    );

    expect(altered['x-amz-content-sha256']).not.toBe(
      original['x-amz-content-sha256'],
    );
    expect(altered['authorization']).not.toBe(original['authorization']);
  });

  it('resolves the credentials on every signature', async () => {
    const credentials = new CountingCredentialsProvider({
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    });
    const signer = signerWith(credentials);

    await signer.sign(request());
    await signer.sign(request());

    expect(credentials.resolutions).toBe(2);
  });

  it('scopes the authorization to lambda with SigV4Service.Lambda', async () => {
    const headers = await signerWith(undefined, SigV4Service.Lambda).sign(
      request(),
    );

    expect(headers['authorization']).toContain(
      '/us-east-1/lambda/aws4_request',
    );
  });

  it('produces the captured signature for fixed inputs', async () => {
    const headers = await signerWith().sign(request());

    expect(headers).toEqual({
      authorization:
        'AWS4-HMAC-SHA256 Credential=test-access-key-id/20260101/us-east-1/execute-api/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date;x-tenant-id, Signature=fafb1e0651e5c2be75ca3de00d94d52516fb491ed2fc43ca211fe8d97e23f517',
      'x-amz-date': '20260101T000000Z',
      'x-amz-content-sha256':
        'ab7f9035150e4b6a5b4d13f6e76e6f53f31090ad15ecd82798a659af2ebcb4b9',
    });
  });
});
