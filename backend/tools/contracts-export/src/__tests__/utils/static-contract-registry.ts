import type { ServiceContract } from '@contracts/platform';
import { ContractRegistry } from '../../contract-registry.js';

/** Registro con una lista fija de contratos, para probar sin descubrir carpetas. */
export class StaticContractRegistry extends ContractRegistry {
  constructor(private readonly contracts: readonly ServiceContract[]) {
    super();
  }

  load(): Promise<readonly ServiceContract[]> {
    return Promise.resolve(this.contracts);
  }
}
