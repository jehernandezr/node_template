/** Deja correr las escrituras en segundo plano del caché, sin depender del reloj. */
export class EventLoop {
  /** Cede el turno al bucle de eventos hasta que se vacían las tareas pendientes. */
  static async drain(): Promise<void> {
    await new Promise<void>((resolve) => setImmediate(resolve));
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}
