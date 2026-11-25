import { Clock, TransactionManager } from '@platform/kernel';
import { LoggerPort } from '@platform/observability';

/**
 * Dependencies the service may not provide. Without `Clock` the providers
 * use the system clock; without `TransactionManager` the router stores the
 * result outside a unit of work; without `LoggerPort` a failed lease renewal is not logged.
 */
export class InternalApiOptionalDependency {
  static readonly CLOCK = { token: Clock, optional: true } as const;
  static readonly LOGGER = { token: LoggerPort, optional: true } as const;
  static readonly TRANSACTIONS = {
    token: TransactionManager,
    optional: true,
  } as const;
}
