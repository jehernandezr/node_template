import { ResilienceRegistry } from '@platform/resilience';
import { OperationMetadata } from '../../contract/operation-metadata.js';
import { ExternalApiPolicy } from '../external-api-policy.js';

describe('ExternalApiPolicy', () => {
  it('is named external-api', () => {
    expect(ExternalApiPolicy.NAME.value).toBe('external-api');
  });

  it('uses the default attempt timeout and retry policy of the operations', () => {
    expect(ExternalApiPolicy.CONFIG.timeoutMs).toBe(
      OperationMetadata.DEFAULT_TIMEOUT_MS,
    );
    expect(ExternalApiPolicy.CONFIG.retry?.policy).toBe(
      OperationMetadata.DEFAULT_RETRY_POLICY,
    );
  });

  it('registers and executes an operation in a resilience registry', async () => {
    const registry = new ResilienceRegistry();

    expect(() =>
      registry.register(ExternalApiPolicy.NAME, ExternalApiPolicy.CONFIG),
    ).not.toThrow();
    await expect(
      registry.execute(ExternalApiPolicy.NAME, async () => 'done'),
    ).resolves.toBe('done');
  });
});
