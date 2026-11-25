/** Where the handler of an internal operation runs relative to its idempotency key. */
export enum HandlerUnitOfWork {
  /**
   * The handler and the result save share a `TransactionManager` transaction: the
   * result is stored if and only if the effects were committed.
   */
  Shared = 'shared',
  /**
   * The handler opens its own transactions, on the shard it picks from its input, and the result is
   * stored separately. A service with `requireScope` needs it, since its shard is not known before the handler.
   */
  Handler = 'handler',
}
