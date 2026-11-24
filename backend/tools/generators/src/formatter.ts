/** Formatea lo generado con el estilo del repositorio, para que pase `nx format:check` sin otro paso. */
export abstract class Formatter {
  /** Devuelve el texto tal cual si la extensión no es de las que se formatean. */
  abstract format(path: string, content: string): Promise<string>;
}
