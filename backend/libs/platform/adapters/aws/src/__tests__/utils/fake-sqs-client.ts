import { ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import {
  SdkResponderTable,
  type SdkCommand,
  type SdkCommandClass,
} from './sdk-responder-table.js';

/**
 * `SQSClient` falso: responde con lo registrado por clase de comando y cuenta
 * los cierres. Un comando sin respuesta devuelve `{}`, salvo `ReceiveMessage`,
 * que imita el long polling: espera hasta que el llamador aborta.
 */
export class FakeSqsClient extends SQSClient {
  /** Veces que se llamó `destroy()`. */
  closes = 0;
  /** `ReceiveMessage` que siguen esperando (long polling sin cerrar). */
  pendingReceives = 0;
  /** `pendingReceives` en el momento de `destroy()`, o `undefined` si no se cerró. */
  pendingReceivesAtClose: number | undefined;
  private readonly table = new SdkResponderTable();

  /** Credenciales fijas: así nada consulta la cadena por defecto del SDK. */
  static readonly CREDENTIALS = {
    accessKeyId: 'AKIDFAKE',
    secretAccessKey: 'fake-secret',
  };

  constructor() {
    super({ region: 'us-east-1', credentials: FakeSqsClient.CREDENTIALS });
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

  // El SDK declara `send` con sobrecargas genéricas que una clase derivada no
  // puede reescribir; este es el único cast, y fija el tipo al del original.
  override send = (async (
    command: SdkCommand,
    options?: { abortSignal?: AbortSignal },
  ) => {
    const answer = this.table.respond(command);
    if (answer.found) {
      return answer.value;
    }
    if (command instanceof ReceiveMessageCommand) {
      return this.waitForAbort(options?.abortSignal);
    }
    return {};
  }) as SQSClient['send'];

  override destroy(): void {
    this.closes += 1;
    this.pendingReceivesAtClose = this.pendingReceives;
  }

  private waitForAbort(signal: AbortSignal | undefined): Promise<never> {
    return new Promise((_resolve, reject) => {
      this.pendingReceives += 1;
      const abort = (): void => {
        this.pendingReceives -= 1;
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
      };
      if (signal === undefined || signal.aborted) {
        abort();
        return;
      }
      signal.addEventListener('abort', abort, { once: true });
    });
  }
}
