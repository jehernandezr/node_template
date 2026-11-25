import type { ReplicationMode } from 'typeorm';

/**
 * Stands in for `CatalogDataSource`: its `DataSource` has no rows and records the replication mode of each
 * `QueryRunner` requested from it, to see whether a read went to the primary or to the replica.
 */
export class RecordingCatalogDataSource {
  readonly modes: ReplicationMode[] = [];

  get(): Promise<unknown> {
    return Promise.resolve({
      createQueryRunner: (mode: ReplicationMode) => {
        this.modes.push(mode);
        return {
          manager: { findOneBy: () => Promise.resolve(null) },
          release: () => Promise.resolve(),
        };
      },
    });
  }
}
