import { createHash, createHmac } from 'node:crypto';
import type { AwsCredentials } from '../../aws-credentials.js';

/**
 * Recomputes the SigV4 signature of a presigned token from the signature process of the AWS documentation, written
 * apart from the signer under test: canonical request of `GET /` with the token's query, the `host` header and the
 * SHA-256 of an empty body.
 */
export class PresignedTokenVerifier {
  private static readonly EMPTY_PAYLOAD_SHA256 =
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  constructor(
    private readonly credentials: AwsCredentials,
    private readonly region: string,
    private readonly service: string,
  ) {}

  /**
   * The signature the token should carry.
   * @param token Token without the scheme: `<host>:<port>/?<query>`.
   * @returns The hex signature.
   */
  expectedSignature(token: string): string {
    const [authority = '', query = ''] = token.split('/?');
    const pairs = query
      .split('&')
      .map((pair) => pair.split('=') as [string, string])
      .filter(([key]) => key !== 'X-Amz-Signature')
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const params = new Map(pairs);
    const amzDate = params.get('X-Amz-Date') ?? '';
    const date = amzDate.slice(0, 8);
    const scope = `${date}/${this.region}/${this.service}/aws4_request`;
    const canonical = [
      'GET',
      '/',
      pairs.map(([key, value]) => `${key}=${value}`).join('&'),
      `host:${authority}\n`,
      'host',
      PresignedTokenVerifier.EMPTY_PAYLOAD_SHA256,
    ].join('\n');
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      createHash('sha256').update(canonical).digest('hex'),
    ].join('\n');
    let key: Buffer | string = `AWS4${this.credentials.secretAccessKey}`;
    for (const part of [date, this.region, this.service, 'aws4_request']) {
      key = createHmac('sha256', key).update(part).digest();
    }
    return createHmac('sha256', key).update(stringToSign).digest('hex');
  }
}
