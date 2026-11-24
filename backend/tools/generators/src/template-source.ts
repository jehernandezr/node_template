import { join } from 'node:path';
import type { FileSystem } from './file-system.js';
import { TemplateRenderer } from './template-renderer.js';

/** Un archivo de plantilla: su ruta relativa a la carpeta de la plantilla y su texto. */
export interface TemplateFile {
  readonly path: string;
  readonly content: string;
}

/** Las plantillas de un generador, leídas de `templates/<tipo>`. */
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
