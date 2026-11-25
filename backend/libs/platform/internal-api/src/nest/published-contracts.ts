import { ContractRegistry } from '../contract/contract-registry.js';

/**
 * Catalog of the operations this service publishes, that is, the ones it
 * must handle with a handler. It is a different token from `ContractRegistry`, which
 * also includes the remote operations the service calls.
 */
export class PublishedContracts extends ContractRegistry {}
