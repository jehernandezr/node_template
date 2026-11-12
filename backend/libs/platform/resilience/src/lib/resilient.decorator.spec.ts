import { ResilienceRegistry } from './registry.js';
import { Resilient } from './resilient.decorator.js';
import { ResiliencePolicyName } from './policy-name.js';

function transientError(): Error {
  return Object.assign(new Error('upstream down'), { status: 503 });
}

class Gateway {
  @Resilient(ResiliencePolicyName.Cache)
  async read(value: string, signal?: AbortSignal): Promise<string> {
    return `${value}:${signal instanceof AbortSignal}`;
  }

  @Resilient(ResiliencePolicyName.Cache)
  async fail(): Promise<never> {
    throw new Error('boom');
  }

  calls = 0;

  @Resilient(ResiliencePolicyName.ExternalApi)
  async flakyNoRetry(): Promise<never> {
    this.calls += 1;
    throw transientError();
  }

  @Resilient(ResiliencePolicyName.ExternalApi, { idempotent: true })
  async flakyRetry(): Promise<never> {
    this.calls += 1;
    throw transientError();
  }
}

describe('@Resilient', () => {
  afterEach(() => {
    ResilienceRegistry.setDefault(undefined);
  });

  it('wraps the method, appends the abort signal and returns its result', async () => {
    ResilienceRegistry.setDefault(new ResilienceRegistry());

    await expect(new Gateway().read('ok')).resolves.toBe('ok:true');
  });

  it('propagates errors from the method', async () => {
    ResilienceRegistry.setDefault(new ResilienceRegistry());

    await expect(new Gateway().fail()).rejects.toThrow('boom');
  });

  it('does not retry a non-idempotent method', async () => {
    ResilienceRegistry.setDefault(new ResilienceRegistry());
    const gateway = new Gateway();

    await expect(gateway.flakyNoRetry()).rejects.toThrow('upstream down');
    expect(gateway.calls).toBe(1);
  });

  it('retries an idempotent method', async () => {
    ResilienceRegistry.setDefault(
      new ResilienceRegistry({
        [ResiliencePolicyName.ExternalApi]: {
          timeoutMs: 50,
          retry: { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 2 },
        },
      }),
    );
    const gateway = new Gateway();

    await expect(gateway.flakyRetry()).rejects.toThrow('upstream down');
    expect(gateway.calls).toBe(3);
  });

  it('rejects with a clear error when no default registry is set', async () => {
    await expect(new Gateway().read('x')).rejects.toThrow(
      /no default ResilienceRegistry/,
    );
  });
});
