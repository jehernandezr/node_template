import type { SagaDefinitionIssueCode } from './saga-definition-issue-code.enum.js';

/** Issue found in a saga definition. */
export interface SagaDefinitionIssue {
  readonly code: SagaDefinitionIssueCode;
  readonly sagaType: string;
  readonly stepIndex?: number;
  readonly operationId?: string;
  readonly message: string;
}
