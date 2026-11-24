import { Formatter } from '../../formatter.js';

/** Deja el texto como sale de la plantilla: las plantillas ya tienen el formato del repositorio. */
export class UnchangedFormatter extends Formatter {
  async format(_path: string, content: string): Promise<string> {
    return content;
  }
}
