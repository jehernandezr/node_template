/** Command as the Valkey client receives it. */
export interface FakeValkeyCommand {
  readonly name: string;
  readonly args: unknown[];
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
}

/** Test Valkey client with the internal shape that the instrumentation wraps. */
export class FakeValkey {
  readonly options = { host: 'cache.local', port: 6379 };

  sendCommand(command: FakeValkeyCommand): void {
    queueMicrotask(() => command.resolve('OK'));
  }

  connect(): Promise<void> {
    return Promise.resolve();
  }
}
