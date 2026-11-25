import type { RegistryIssueCode } from './registry-issue-code.enum.js';

/** Problem that `ContractRegistry.validate()` finds. */
export interface RegistryIssue {
  readonly code: RegistryIssueCode;
  readonly operationId: string;
  readonly message: string;
}
