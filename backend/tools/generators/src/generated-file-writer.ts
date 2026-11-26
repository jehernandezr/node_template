import { join } from 'node:path';
import type { FileSystem } from './file-system.js';
import type { Formatter } from './formatter.js';
import { GeneratorError, GeneratorErrorReason } from './generator-error.js';

/** A file ready to write: its path relative to `backend/` and its text. */
export interface GeneratedFile {
  readonly path: string;
  readonly content: string;
}

/** Writes the generated output formatted, without overwriting anything: if a file already exists it writes none. */
export class GeneratedFileWriter {
  constructor(
    private readonly files: FileSystem,
    private readonly formatter: Formatter,
    private readonly backendRoot: string,
  ) {}

  /**
   * Writes new files, all or none.
   * @param generated Files to write.
   * @throws GeneratorError `AlreadyExists` if any of the files already exists.
   */
  async writeNew(generated: readonly GeneratedFile[]): Promise<void> {
    for (const file of generated) {
      if (await this.files.exists(this.absolute(file.path))) {
        throw new GeneratorError(
          GeneratorErrorReason.AlreadyExists,
          `${file.path} already exists`,
        );
      }
    }
    for (const file of generated) {
      await this.overwrite(file);
    }
  }

  /**
   * Rewrites an existing file.
   * @param file File with its new content.
   */
  async overwrite(file: GeneratedFile): Promise<void> {
    const path = this.absolute(file.path);
    await this.files.write(
      path,
      await this.formatter.format(path, file.content),
    );
  }

  /**
   * Reads a file of the workspace.
   * @param path File to read.
   * @returns Its content.
   */
  read(path: string): Promise<string> {
    return this.files.read(this.absolute(path));
  }

  /**
   * Tells whether a workspace path exists.
   * @param path Path to check.
   * @returns `true` when it exists.
   */
  exists(path: string): Promise<boolean> {
    return this.files.exists(this.absolute(path));
  }

  private absolute(path: string): string {
    return join(this.backendRoot, path);
  }
}
