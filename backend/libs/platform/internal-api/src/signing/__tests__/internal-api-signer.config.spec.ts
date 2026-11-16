import { InternalApiSignerKind } from '../internal-api-signer-kind.enum.js';
import { internalApiSignerConfigSchema } from '../internal-api-signer.config.js';

describe('internalApiSignerConfigSchema', () => {
  it('defaults INTERNAL_API_SIGNER to HMAC', () => {
    const parsed = internalApiSignerConfigSchema.parse({});

    expect(parsed.INTERNAL_API_SIGNER).toBe(InternalApiSignerKind.Hmac);
  });

  it('accepts sigv4', () => {
    const parsed = internalApiSignerConfigSchema.parse({
      INTERNAL_API_SIGNER: 'sigv4',
    });

    expect(parsed.INTERNAL_API_SIGNER).toBe(InternalApiSignerKind.SigV4);
  });

  it('rejects an unknown signer', () => {
    const result = internalApiSignerConfigSchema.safeParse({
      INTERNAL_API_SIGNER: 'rsa',
    });

    expect(result.success).toBe(false);
  });
});
