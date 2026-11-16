import type {
  ShardDirectoryChangeHandler,
  ShardDirectoryChanged,
} from '@platform/sharding';

/** Receptor de cambios del directorio que guarda lo que recibe y puede fallar a propósito. */
export class RecordingChangeHandler {
  readonly received: ShardDirectoryChanged[] = [];

  constructor(private readonly failure?: Error) {}

  /** Lo que se pasa a `subscribe`. */
  readonly handle: ShardDirectoryChangeHandler = (event) => {
    this.received.push(event);
    if (this.failure !== undefined) {
      throw this.failure;
    }
  };
}
