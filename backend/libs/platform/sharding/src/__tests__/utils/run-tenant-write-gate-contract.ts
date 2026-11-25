import type { TenantWriteGate } from '../../ports/tenant-write-gate.js';
import { TestTenants } from './test-tenants.js';

/** What the contract test needs from each gate adapter. */
export interface TenantWriteGateContractSubject {
  /** A new gate, with the tenants `TestTenants.One` and `Two` open. */
  create(): Promise<TenantWriteGate>;
  /** Releases what `create` opened. */
  dispose?(): Promise<void>;
}

/** Contract test of `TenantWriteGate`: each adapter runs it with its own infrastructure. */
export function runTenantWriteGateContract(
  name: string,
  subject: TenantWriteGateContractSubject,
): void {
  describe(`${name} as a TenantWriteGate`, () => {
    let gate: TenantWriteGate;

    beforeEach(async () => {
      gate = await subject.create();
    });

    afterEach(async () => {
      await subject.dispose?.();
    });

    it('starts open', async () => {
      await expect(gate.isClosed(TestTenants.One)).resolves.toBe(false);
    });

    it('closes only the tenant it is asked to close', async () => {
      await gate.close(TestTenants.One);

      await expect(gate.isClosed(TestTenants.One)).resolves.toBe(true);
      await expect(gate.isClosed(TestTenants.Two)).resolves.toBe(false);
    });

    it('opens a closed tenant again', async () => {
      await gate.close(TestTenants.One);
      await gate.open(TestTenants.One);

      await expect(gate.isClosed(TestTenants.One)).resolves.toBe(false);
    });

    it('accepts closing and opening twice in a row', async () => {
      await gate.close(TestTenants.One);
      await gate.close(TestTenants.One);
      await expect(gate.isClosed(TestTenants.One)).resolves.toBe(true);

      await gate.open(TestTenants.One);
      await gate.open(TestTenants.One);
      await expect(gate.isClosed(TestTenants.One)).resolves.toBe(false);
    });
  });
}
