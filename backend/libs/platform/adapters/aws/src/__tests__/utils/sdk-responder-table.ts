/** SDK command as a fake client sees it. */
export interface SdkCommand {
  readonly input: object;
}

/** Constructor of an SDK command class. */
export type SdkCommandClass<I extends object> = new (input: I) => SdkCommand;

/**
 * Response table of a fake SDK client: one response is registered
 * per command class, so tests do not compare command names with `if`.
 * Stores each received command in order.
 */
export class SdkResponderTable {
  readonly sent: SdkCommand[] = [];
  private readonly responders = new Map<unknown, (input: never) => unknown>();
  private readonly pending = new Map<unknown, ((input: never) => unknown)[]>();

  /** The response can be a value, a promise or throw an error. */
  on<I extends object>(
    command: SdkCommandClass<I>,
    responder: (input: I) => unknown,
  ): void {
    this.responders.set(command, responder as (input: never) => unknown);
  }

  /**
   * One-time response: the next call of that class consumes it and
   * it takes priority over `on`. Several are consumed in the order they were registered.
   */
  once<I extends object>(
    command: SdkCommandClass<I>,
    responder: (input: I) => unknown,
  ): void {
    const queue = this.pending.get(command) ?? [];
    queue.push(responder as (input: never) => unknown);
    this.pending.set(command, queue);
  }

  /** Commands received of that class, in order. */
  sentOf<I extends object>(command: SdkCommandClass<I>): SdkCommand[] {
    return this.sent.filter((sent) => sent instanceof command);
  }

  /**
   * Responds with the first one-time response of the command's class or,
   * if none is left, with the `on` one; `found` is `false` if there is none.
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
