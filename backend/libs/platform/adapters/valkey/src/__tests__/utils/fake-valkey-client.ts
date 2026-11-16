/**
 * Cliente de iovalkey falso para las pruebas de módulo: responde `PING`,
 * guarda cada comando y cuenta los cierres.
 */
export class FakeValkeyClient {
  readonly commands: string[] = [];
  quits = 0;
  disconnects = 0;
  /** Si es `true`, `quit` falla y el ciclo de vida debe cortar la conexión. */
  quitFails = false;

  /** @param log Bitácora compartida con otros dobles, para comprobar el orden de los cierres. */
  constructor(private readonly log: string[] = []) {}

  async call(command: string): Promise<unknown> {
    this.commands.push(command);
    return command === 'PING' ? 'PONG' : null;
  }

  async quit(): Promise<string> {
    this.quits += 1;
    this.log.push('client quit');
    if (this.quitFails) {
      throw new Error('Connection is closed.');
    }
    return 'OK';
  }

  disconnect(): void {
    this.disconnects += 1;
  }
}
