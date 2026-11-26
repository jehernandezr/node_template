/** The service that owns the data copied into a projection. */
export enum BackfillSource {
  Tasks = 'tasks',
  Invoices = 'invoices',
}

/** How far a projection of the tenant of the open `ShardScope` has been backfilled. */
export interface Backfill {
  readonly cursor?: string;
  readonly completed: boolean;
}

/** Backfill progress of each tenant, with one cursor per source. */
export abstract class BackfillProgress {
  /**
   * Reads how far the backfill of a source got.
   * @param source Service whose history is backfilled.
   * @returns The backfill state.
   */
  abstract find(source: BackfillSource): Promise<Backfill>;
  /**
   * Stores how far the backfill of a source got.
   * @param source Service whose history is backfilled.
   * @param backfill New state.
   */
  abstract save(source: BackfillSource, backfill: Backfill): Promise<void>;
}
