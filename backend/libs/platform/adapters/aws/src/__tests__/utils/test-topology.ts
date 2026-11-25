import { type QueueDef, topologyFromContracts } from '@platform/messaging';
import {
  ledgerContract,
  reportsContract,
  tasksContract,
} from './test-contracts.js';

/** Test topology, built with the contracts in `test-contracts.ts`. */
export class TestTopology {
  static readonly topology = topologyFromContracts([
    tasksContract,
    reportsContract,
    ledgerContract,
  ]);

  /** Topology queue by its logical name; fails if the test contract does not declare it. */
  static queue(name: string): QueueDef {
    const queue = TestTopology.topology.queueFor(name);
    if (queue === undefined) {
      throw new Error(`the test topology has no queue "${name}"`);
    }
    return queue;
  }
}
