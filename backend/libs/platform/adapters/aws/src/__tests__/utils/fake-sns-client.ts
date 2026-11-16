import { SNSClient } from '@aws-sdk/client-sns';
import {
  SdkResponderTable,
  type SdkCommand,
  type SdkCommandClass,
} from './sdk-responder-table.js';

/**
 * `SNSClient` falso: responde con lo registrado por clase de comando (`{}` si
 * no hay) y cuenta los cierres.
 */
export class FakeSnsClient extends SNSClient {
  /** Veces que se llamó `destroy()`. */
  closes = 0;
  private readonly table = new SdkResponderTable();

  /** Credenciales fijas: así nada consulta la cadena por defecto del SDK. */
  static readonly CREDENTIALS = {
    accessKeyId: 'AKIDFAKE',
    secretAccessKey: 'fake-secret',
  };

  constructor() {
    super({ region: 'us-east-1', credentials: FakeSnsClient.CREDENTIALS });
  }

  get sent(): readonly SdkCommand[] {
    return this.table.sent;
  }

  on<I extends object>(
    command: SdkCommandClass<I>,
    responder: (input: I) => unknown,
  ): this {
    this.table.on(command, responder);
    return this;
  }

  /** Respuesta de un solo uso; después vuelve a la de `on` o a la de por defecto. */
  once<I extends object>(
    command: SdkCommandClass<I>,
    responder: (input: I) => unknown,
  ): this {
    this.table.once(command, responder);
    return this;
  }

  sentOf<I extends object>(command: SdkCommandClass<I>): SdkCommand[] {
    return this.table.sentOf(command);
  }

  // Mismo motivo que `FakeSqsClient.send`: el único cast de la clase.
  override send = (async (command: SdkCommand) => {
    const answer = this.table.respond(command);
    return answer.found ? answer.value : {};
  }) as SNSClient['send'];

  override destroy(): void {
    this.closes += 1;
  }
}
