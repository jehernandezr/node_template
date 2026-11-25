import type {
  AcrossShardsOptions,
  AcrossShardsResult,
  ShardConnection,
} from '@platform/persistence';

/** Stands in for `AcrossShards`: it does not visit any shard and records the options of each pass. */
export class RecordingAcrossShards {
  readonly calls: (AcrossShardsOptions | undefined)[] = [];

  run<T>(
    _fn: (connection: ShardConnection) => Promise<T>,
    options?: AcrossShardsOptions,
  ): Promise<AcrossShardsResult<T>> {
    this.calls.push(options);
    return Promise.resolve({ results: [], failures: [], partial: false });
  }
}
