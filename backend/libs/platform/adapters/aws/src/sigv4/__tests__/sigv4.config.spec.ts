import { SigV4Service } from '../sigv4-service.enum.js';
import { sigV4ConfigSchema } from '../sigv4.config.js';

describe('sigV4ConfigSchema', () => {
  it('defaults INTERNAL_API_SIGV4_SERVICE to execute-api', () => {
    const parsed = sigV4ConfigSchema.parse({});

    expect(parsed.INTERNAL_API_SIGV4_SERVICE).toBe(SigV4Service.ExecuteApi);
  });

  it('accepts lambda', () => {
    const parsed = sigV4ConfigSchema.parse({
      INTERNAL_API_SIGV4_SERVICE: 'lambda',
    });

    expect(parsed.INTERNAL_API_SIGV4_SERVICE).toBe(SigV4Service.Lambda);
  });

  it('rejects an unknown service', () => {
    const result = sigV4ConfigSchema.safeParse({
      INTERNAL_API_SIGV4_SERVICE: 'sqs',
    });

    expect(result.success).toBe(false);
  });
});
