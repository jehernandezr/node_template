import type { ServiceContract } from '@contracts/platform';

/** Source of the contracts that are exported. */
export abstract class ContractRegistry {
  /**
   * Loads the contracts of every service.
   * @returns The contracts.
   */
  abstract load(): Promise<readonly ServiceContract[]>;
}
