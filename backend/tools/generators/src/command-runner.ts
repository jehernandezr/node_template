/** Un comando del sistema que corre la prueba de humo de los generadores. */
export interface CommandRun {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  /** Variables que se suman a las del proceso. */
  readonly env?: Readonly<Record<string, string>>;
  /** Variables del proceso que el comando no hereda. */
  readonly unset?: readonly string[];
}

/** Corre comandos del sistema, para probar la prueba de humo sin lanzar procesos. */
export abstract class CommandRunner {
  /** @returns el código de salida del comando. */
  abstract run(run: CommandRun): Promise<number>;
}
