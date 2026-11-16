import type { RegistryIssueCode } from './registry-issue-code.enum.js';

/** Problema que encuentra `ContractRegistry.validate()`. */
export interface RegistryIssue {
  readonly code: RegistryIssueCode;
  readonly operationId: string;
  readonly message: string;
}
