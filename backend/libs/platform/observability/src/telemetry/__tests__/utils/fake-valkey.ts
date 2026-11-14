/** Comando como lo recibe el cliente de Valkey. */
export interface FakeValkeyCommand {
  readonly name: string;
  readonly args: unknown[];
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
}

/** Cliente de Valkey de prueba con la forma interna que envuelve la instrumentación. */
export class FakeValkey {
  readonly options = { host: 'cache.local', port: 6379 };

  sendCommand(command: FakeValkeyCommand): void {
    // Como el cliente real, la respuesta llega después de que sendCommand retorna.
    queueMicrotask(() => command.resolve('OK'));
  }

  connect(): Promise<void> {
    return Promise.resolve();
  }
}
