import { join } from 'node:path';
import type { FileSystem } from './file-system.js';
import { TemplateRenderer } from './template-renderer.js';

/** A template file: its path relative to the template folder and its text. */
export interface TemplateFile {
  readonly path: string;
  readonly content: string;
}

/** A generator's templates, read from `templates/<kind>`. */
export class TemplateSource {
  constructor(
    private readonly files: FileSystem,
    private readonly templatesRoot: string,
  ) {}

  async load(kind: string): Promise<TemplateFile[]> {
    const root = join(this.templatesRoot, kind);
    const paths = (await this.files.listFiles(root)).filter((path) =>
      path.endsWith(TemplateRenderer.SUFFIX),
    );
    return Promise.all(
      paths.map(async (path) => ({
        path,
        content: await this.files.read(join(root, path)),
      })),
    );
  }
}
