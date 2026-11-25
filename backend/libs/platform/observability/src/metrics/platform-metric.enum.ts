/** Metrics published by observability. Each library declares its own. */
export enum PlatformMetric {
  /** Error counter by `SERVICE.SUBMODULE.ERROR` code. */
  Errors = 'platform.errors',
}
