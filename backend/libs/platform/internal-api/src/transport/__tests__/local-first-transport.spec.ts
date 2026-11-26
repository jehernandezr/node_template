import { CallOutcome, type CallOutcome as Outcome } from '@platform/primitives';
import type { CallMeta } from '../call-meta.js';
import { LocalFirstTransport } from '../local-first-transport.js';
import { Transport } from '../transport.js';

/** Transport that responds with its name, to see which way each call went out. */
class NamedTransport extends Transport {
  constructor(private readonly name: string) {
    super();
  }

  override async invoke(operationId: string): Promise<Outcome<unknown>> {
    return CallOutcome.success({ via: this.name, operationId });
  }
}

const meta: CallMeta = {
  idempotencyKey: 'key-1',
  deadline: Date.now() + 1000,
  timeoutMs: 1000,
};

describe('LocalFirstTransport', () => {
  const transport = new LocalFirstTransport(
    new Set(['identity.tenants.create.v1']),
    new NamedTransport('local'),
    new NamedTransport('remote'),
  );

  it('calls an operation of the service itself through the local router', async () => {
    await expect(
      transport.invoke('identity.tenants.create.v1', {}, meta),
    ).resolves.toEqual(
      CallOutcome.success({
        via: 'local',
        operationId: 'identity.tenants.create.v1',
      }),
    );
  });

  it('calls an operation of another service through the network', async () => {
    await expect(
      transport.invoke('billing.accounts.open.v1', {}, meta),
    ).resolves.toEqual(
      CallOutcome.success({
        via: 'remote',
        operationId: 'billing.accounts.open.v1',
      }),
    );
  });
});
