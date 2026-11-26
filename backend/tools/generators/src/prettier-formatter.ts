import { format, getFileInfo, resolveConfig } from 'prettier';
import { Formatter } from './formatter.js';

/** Prettier with the repository configuration; files it cannot infer (`.gitkeep`, `.tfvars`) stay the same. */
export class PrettierFormatter extends Formatter {
  override async format(path: string, content: string): Promise<string> {
    const info = await getFileInfo(path);
    if (info.inferredParser === null) {
      return content;
    }
    const config = (await resolveConfig(path)) ?? {};
    return format(content, { ...config, filepath: path });
  }
}
