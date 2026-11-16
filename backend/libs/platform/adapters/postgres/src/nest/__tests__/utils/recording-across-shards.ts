import type {
  AcrossShardsOptions,
  AcrossShardsResult,
  ShardConnection,
} from '@platform/persistence';

/** Ocupa el lugar de `AcrossShards`: no recorre ningún shard y guarda las opciones de cada pasada. */
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
