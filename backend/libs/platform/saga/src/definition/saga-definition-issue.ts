import type { SagaDefinitionIssueCode } from './saga-definition-issue-code.enum.js';

/** Problema encontrado en una definición de saga. */
export interface SagaDefinitionIssue {
  readonly code: SagaDefinitionIssueCode;
  readonly sagaType: string;
  readonly stepIndex?: number;
  readonly operationId?: string;
  readonly message: string;
}
