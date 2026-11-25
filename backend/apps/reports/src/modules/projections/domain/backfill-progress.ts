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
  abstract find(source: BackfillSource): Promise<Backfill>;
  abstract save(source: BackfillSource, backfill: Backfill): Promise<void>;
}
