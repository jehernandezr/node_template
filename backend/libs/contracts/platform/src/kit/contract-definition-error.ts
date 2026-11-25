/**
 * Error when declaring a contract: malformed route, operation, event or catalog.
 * Thrown when the contract module loads, never at request time.
 */
export class ContractDefinitionError extends Error {
  override readonly name = 'ContractDefinitionError';
}
