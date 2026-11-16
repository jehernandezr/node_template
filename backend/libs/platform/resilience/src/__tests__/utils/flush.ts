/** Deja correr las promesas pendientes con temporizadores reales. */
export class Flush {
  static macrotask(): Promise<void> {
    return new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  }
}
