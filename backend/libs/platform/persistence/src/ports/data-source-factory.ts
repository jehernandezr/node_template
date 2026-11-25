import type { DataSource } from 'typeorm';
import type { DatabaseTarget } from '../model/database-target.js';
import type { InstanceEndpoints } from '../model/instance-endpoints.js';

/** Builds the (uninitialized) `DataSource` of a logical database. It is the seam that tests replace. */
export abstract class DataSourceFactory {
  abstract create(
    target: DatabaseTarget,
    endpoints: InstanceEndpoints,
  ): DataSource;
}
