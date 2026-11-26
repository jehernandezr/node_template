import type { PersistenceContext } from './persistence-context.js';

/** Source of the request context. It is called on every statement, so it must be cheap. */
export abstract class PersistenceContextProvider {
  /**
   * Returns an empty context (`{}`) when there is no active request, message or job.
   * @returns The context.
   */
  abstract current(): PersistenceContext;
}
