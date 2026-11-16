import { type QueueDef, topologyFromContracts } from '@platform/messaging';
import {
  ledgerContract,
  reportsContract,
  tasksContract,
} from './test-contracts.js';

/** Topología de las pruebas, armada con los contratos de `test-contracts.ts`. */
export class TestTopology {
  static readonly topology = topologyFromContracts([
    tasksContract,
    reportsContract,
    ledgerContract,
  ]);

  /** Cola de la topología por su nombre lógico; falla si el contrato de prueba no la declara. */
  static queue(name: string): QueueDef {
    const queue = TestTopology.topology.queueFor(name);
    if (queue === undefined) {
      throw new Error(`the test topology has no queue "${name}"`);
    }
    return queue;
  }
}
