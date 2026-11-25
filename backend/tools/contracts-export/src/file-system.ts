/** Disk access the export needs, so it can be tested without touching it. */
export abstract class FileSystem {
  abstract exists(path: string): Promise<boolean>;
  abstract read(path: string): Promise<string>;
  /** Writes the file and creates any missing folders. */
  abstract write(path: string, content: string): Promise<void>;
  /** Names of the direct subdirectories, in alphabetical order. */
  abstract listDirectories(path: string): Promise<string[]>;
}
