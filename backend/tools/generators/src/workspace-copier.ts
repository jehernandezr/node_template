/** Hace y borra una copia del workspace donde la prueba de humo puede generar sin tocar el repositorio. */
export abstract class WorkspaceCopier {
  /** @returns la raíz de la copia. */
  abstract copy(): Promise<string>;

  abstract remove(root: string): Promise<void>;
}
