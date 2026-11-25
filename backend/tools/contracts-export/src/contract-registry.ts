import type { ServiceContract } from '@contracts/platform';

/** Source of the contracts that are exported. */
export abstract class ContractRegistry {
  abstract load(): Promise<readonly ServiceContract[]>;
}
