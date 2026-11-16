import type { ServiceContract } from '@contracts/platform';

/** Origen de los contratos que se exportan. */
export abstract class ContractRegistry {
  abstract load(): Promise<readonly ServiceContract[]>;
}
