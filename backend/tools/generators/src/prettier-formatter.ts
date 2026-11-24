import { format, getFileInfo, resolveConfig } from 'prettier';
import { Formatter } from './formatter.js';

/** Prettier con la configuración del repositorio; los archivos que no infiere (`.gitkeep`, `.tfvars`) quedan igual. */
export class PrettierFormatter extends Formatter {
  async format(path: string, content: string): Promise<string> {
    const info = await getFileInfo(path);
    if (info.inferredParser === null) {
      return content;
    }
    const config = (await resolveConfig(path)) ?? {};
    return format(content, { ...config, filepath: path });
  }
}
