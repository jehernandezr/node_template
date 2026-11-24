import type { TenantWriteGate } from '../../ports/tenant-write-gate.js';
import { TestTenants } from './test-tenants.js';

/** Lo que la prueba de contrato necesita de cada adaptador de la compuerta. */
export interface TenantWriteGateContractSubject {
  /** Una compuerta nueva, con los tenants `TestTenants.One` y `Two` abiertos. */
  create(): Promise<TenantWriteGate>;
  /** Libera lo que `create` abrió. */
  dispose?(): Promise<void>;
}

/** Prueba de contrato de `TenantWriteGate`: cada adaptador la corre con su propia infraestructura. */
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
