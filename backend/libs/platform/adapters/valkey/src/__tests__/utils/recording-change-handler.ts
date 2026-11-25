import type {
  ShardDirectoryChangeHandler,
  ShardDirectoryChanged,
} from '@platform/sharding';

/** Directory change receiver that records what it receives and can fail on purpose. */
export class RecordingChangeHandler {
  readonly received: ShardDirectoryChanged[] = [];

  constructor(private readonly failure?: Error) {}

  /** What is passed to `subscribe`. */
  readonly handle: ShardDirectoryChangeHandler = (event) => {
    this.received.push(event);
    if (this.failure !== undefined) {
      throw this.failure;
    }
  };
}
