import { SystemClock } from '@platform/kernel';
import { ShardingErrorCode } from '../../errors/sharding-error-code.enum.js';
import { TenantWriteGate } from '../../ports/tenant-write-gate.js';
import { TestTenants } from '../../__tests__/utils/index.js';
import { TenantWriteWaiter } from '../tenant-write-waiter.js';

/** In-memory gate: the state of each tenant lives in a set. */
class InMemoryWriteGate extends TenantWriteGate {
  private readonly closed = new Set<string>();

  override async isClosed(tenantId: string): Promise<boolean> {
    return this.closed.has(tenantId);
  }

  override async close(tenantId: string): Promise<void> {
    this.closed.add(tenantId);
  }

  override async open(tenantId: string): Promise<void> {
    this.closed.delete(tenantId);
  }
}

describe('TenantWriteWaiter', () => {
  const options = { maxWaitMs: 200, pollMs: 5 };

  it('lets a write through at once when the gate is open', async () => {
    const waiter = new TenantWriteWaiter(
      new InMemoryWriteGate(),
      new SystemClock(),
      options,
    );

    await expect(waiter.awaitOpen(TestTenants.One)).resolves.toBeUndefined();
  });

  it('holds a write until the gate opens again', async () => {
    const gate = new InMemoryWriteGate();
    await gate.close(TestTenants.One);
    const waiter = new TenantWriteWaiter(gate, new SystemClock(), options);
    let released = false;

    const waiting = waiter.awaitOpen(TestTenants.One).then(() => {
      released = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(released).toBe(false);
    await gate.open(TestTenants.One);
    await waiting;

    expect(released).toBe(true);
  });

  it('answers TENANT_MIGRATING with a retry hint when the gate stays closed', async () => {
    const gate = new InMemoryWriteGate();
    await gate.close(TestTenants.One);
    const waiter = new TenantWriteWaiter(gate, new SystemClock(), {
      maxWaitMs: 30,
      pollMs: 5,
    });

    await expect(waiter.awaitOpen(TestTenants.One)).rejects.toMatchObject({
      code: ShardingErrorCode.TenantMigrating,
      retryable: true,
      details: { tenantId: TestTenants.One, retryAfterSeconds: 1 },
    });
  });
});
