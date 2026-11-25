import { Formatter } from '../../formatter.js';

/** Leaves the text as it comes out of the template: the templates already have the repository formatting. */
export class UnchangedFormatter extends Formatter {
  async format(_path: string, content: string): Promise<string> {
    return content;
  }
}
