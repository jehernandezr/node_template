/**
 * Fake iovalkey client for the module tests: answers `PING`,
 * records each command and counts the closes.
 */
export class FakeValkeyClient {
  readonly commands: string[] = [];
  quits = 0;
  disconnects = 0;
  /** Whether `quit` fails, so the lifecycle must cut the connection. */
  quitFails = false;

  /** @param log Log shared with other doubles, to check the order of the closes. */
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
