import { ContractRegistry } from '../contract/contract-registry.js';

/**
 * Catálogo de las operaciones que este servicio publica, es decir, las que
 * debe atender con un handler. Es un token distinto de `ContractRegistry`, que
 * además incluye las operaciones remotas que el servicio llama.
 */
export class PublishedContracts extends ContractRegistry {}
