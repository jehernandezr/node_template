/** Tipo de problema que encuentra `ContractRegistry.validate()`. */
export enum RegistryIssueCode {
  DuplicateId = 'duplicate-id',
  MissingCompensation = 'missing-compensation',
  UnknownCompensation = 'unknown-compensation',
  CallBudgetExceeded = 'call-budget-exceeded',
}
