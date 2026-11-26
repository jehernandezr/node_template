import { FailureClassifier } from '@platform/primitives';
import { ResilienceRegistryFactory } from '@platform/resilience';
import { SystemClock, SystemRandomSource } from '@platform/kernel';
import { defineOperation } from '@contracts/platform';
import { z } from 'zod';
import { OperationResolver } from '../../contract/operation-resolver.js';
import { ExternalApiPolicy } from '../external-api-policy.js';
import { OperationPolicyResolver } from '../operation-policy-resolver.js';

const resolver = new OperationResolver();

function operation(
  id: string,
  extra: {
    timeoutMs?: number;
    retry?: { maxAttempts: number; baseMs: number; maxMs: number };
  },
) {
  return resolver.resolve(
    defineOperation({
      id,
      input: z.object({}),
      output: z.object({}),
      idempotent: true,
      mutating: false,
      description: 'Test operation.',
      ...extra,
    }),
  ).metadata;
}

describe('OperationPolicyResolver', () => {
  function setup() {
    const registry = new ResilienceRegistryFactory().create(
      {},
      {
        clock: new SystemClock(),
        random: new SystemRandomSource(),
        classifier: new FailureClassifier(),
      },
    );
    registry.register(ExternalApiPolicy.NAME, ExternalApiPolicy.CONFIG);
    return { registry, resolver: new OperationPolicyResolver(registry) };
  }

  it('resolves the shared external policy for an operation without overrides', () => {
    const { resolver: policies } = setup();

    expect(policies.resolve(operation('billing.invoices.list.v1', {}))).toBe(
      ExternalApiPolicy.NAME,
    );
  });

  it('derives a policy named after the effective timeout and retry values', () => {
    const { resolver: policies } = setup();

    const name = policies.resolve(
      operation('billing.invoices.create.v1', {
        timeoutMs: 1000,
        retry: { maxAttempts: 2, baseMs: 5, maxMs: 10 },
      }),
    );

    expect(name.value).toBe('external-api.t1000.a2.b5.m10');
  });

  it('returns the same name for two operations with the same values without registering again', () => {
    const { resolver: policies } = setup();
    const overrides = {
      timeoutMs: 1000,
      retry: { maxAttempts: 2, baseMs: 5, maxMs: 10 },
    };

    const first = policies.resolve(
      operation('billing.invoices.create.v1', overrides),
    );
    const second = policies.resolve(
      operation('billing.invoices.update.v1', overrides),
    );

    expect(second).toBe(first);
  });

  it('gives a derived policy that the registry can execute', async () => {
    const { registry, resolver: policies } = setup();
    const name = policies.resolve(
      operation('billing.invoices.create.v1', {
        timeoutMs: 1000,
        retry: { maxAttempts: 2, baseMs: 5, maxMs: 10 },
      }),
    );

    await expect(registry.execute(name, async () => 'ok')).resolves.toBe('ok');
  });
});
