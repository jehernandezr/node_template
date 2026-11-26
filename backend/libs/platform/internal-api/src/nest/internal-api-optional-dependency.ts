import { TransactionManager } from '@platform/kernel';
import { LoggerPort } from '@platform/observability';

/**
 * Dependencies the service may not provide. Without `TransactionManager` the router stores the result outside a
 * unit of work; without `LoggerPort` a failed lease renewal is not logged.
 */
export class InternalApiOptionalDependency {
  static readonly LOGGER = { token: LoggerPort, optional: true } as const;
  static readonly TRANSACTIONS = {
    token: TransactionManager,
    optional: true,
  } as const;
}
