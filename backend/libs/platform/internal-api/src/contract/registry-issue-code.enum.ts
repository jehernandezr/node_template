/** Type of problem that `ContractRegistry.validate()` finds. */
export enum RegistryIssueCode {
  DuplicateId = 'duplicate-id',
  MissingCompensation = 'missing-compensation',
  UnknownCompensation = 'unknown-compensation',
  CallBudgetExceeded = 'call-budget-exceeded',
}
