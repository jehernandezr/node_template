import { join } from 'node:path';
import type { FileSystem } from './file-system.js';
import type { Formatter } from './formatter.js';
import { GeneratorError, GeneratorErrorReason } from './generator-error.js';

/** Un archivo listo para escribir: su ruta relativa a `backend/` y su texto. */
export interface GeneratedFile {
  readonly path: string;
  readonly content: string;
}

/** Escribe lo generado con formato, sin pisar nada: si un archivo ya existe no escribe ninguno. */
export class GeneratedFileWriter {
  constructor(
    private readonly files: FileSystem,
    private readonly formatter: Formatter,
    private readonly backendRoot: string,
  ) {}

  /** @throws GeneratorError `AlreadyExists` si alguno de los archivos ya existe. */
  async writeNew(generated: readonly GeneratedFile[]): Promise<void> {
    for (const file of generated) {
      if (await this.files.exists(this.absolute(file.path))) {
        throw new GeneratorError(
          GeneratorErrorReason.AlreadyExists,
          `${file.path} ya existe`,
        );
      }
    }
    for (const file of generated) {
      await this.overwrite(file);
    }
  }

  async overwrite(file: GeneratedFile): Promise<void> {
    const path = this.absolute(file.path);
    await this.files.write(
      path,
      await this.formatter.format(path, file.content),
    );
  }

  read(path: string): Promise<string> {
    return this.files.read(this.absolute(path));
  }

  exists(path: string): Promise<boolean> {
    return this.files.exists(this.absolute(path));
  }

  private absolute(path: string): string {
    return join(this.backendRoot, path);
  }
}
