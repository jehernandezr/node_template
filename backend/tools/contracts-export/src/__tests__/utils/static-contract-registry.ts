import type { ServiceContract } from '@contracts/platform';
import { ContractRegistry } from '../../contract-registry.js';

/** Registry with a fixed list of contracts, to test without discovering folders. */
export class StaticContractRegistry extends ContractRegistry {
  constructor(private readonly contracts: readonly ServiceContract[]) {
    super();
  }

  override load(): Promise<readonly ServiceContract[]> {
    return Promise.resolve(this.contracts);
  }
}
