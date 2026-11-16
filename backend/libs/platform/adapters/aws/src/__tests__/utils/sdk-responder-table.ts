/** Comando del SDK tal como lo ve un cliente falso. */
export interface SdkCommand {
  readonly input: object;
}

/** Constructor de la clase de un comando del SDK. */
export type SdkCommandClass<I extends object> = new (input: I) => SdkCommand;

/**
 * Tabla de respuestas de un cliente falso del SDK: se registra una respuesta
 * por clase de comando, así las pruebas no comparan nombres de comando con `if`.
 * Guarda cada comando recibido en orden.
 */
export class SdkResponderTable {
  readonly sent: SdkCommand[] = [];
  private readonly responders = new Map<unknown, (input: never) => unknown>();
  private readonly pending = new Map<unknown, ((input: never) => unknown)[]>();

  /** La respuesta puede ser un valor, una promesa o lanzar un error. */
  on<I extends object>(
    command: SdkCommandClass<I>,
    responder: (input: I) => unknown,
  ): void {
    this.responders.set(command, responder as (input: never) => unknown);
  }

  /**
   * Respuesta de un solo uso: la siguiente llamada de esa clase la consume y
   * tiene prioridad sobre `on`. Varias se consumen en el orden en que se registraron.
   */
  once<I extends object>(
    command: SdkCommandClass<I>,
    responder: (input: I) => unknown,
  ): void {
    const queue = this.pending.get(command) ?? [];
    queue.push(responder as (input: never) => unknown);
    this.pending.set(command, queue);
  }

  /** Comandos recibidos de esa clase, en orden. */
  sentOf<I extends object>(command: SdkCommandClass<I>): SdkCommand[] {
    return this.sent.filter((sent) => sent instanceof command);
  }

  /**
   * Responde con la primera respuesta de un solo uso de la clase del comando o,
   * si no queda ninguna, con la de `on`; `found` es `false` si no hay ninguna.
   */
  respond(command: SdkCommand): { readonly found: boolean; value?: unknown } {
    this.sent.push(command);
    const responder =
      this.pending.get(command.constructor)?.shift() ??
      this.responders.get(command.constructor);
    return responder === undefined
      ? { found: false }
      : { found: true, value: responder(command.input as never) };
  }
}
