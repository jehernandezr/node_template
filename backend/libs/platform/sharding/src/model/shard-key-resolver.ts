/**
 * Produces the routing key of a module that partitions by its own key
 * (`ShardKey.Custom`), for example an account id or a business region.
 * @typeParam TSource what the persistence layer provides: the entity, the criteria or the request.
 */
export interface ShardKeyResolver<TSource = unknown> {
  /** @returns the routing key, or `undefined` if the source has none (the query stops). */
  resolve(source: TSource): string | undefined;
}
