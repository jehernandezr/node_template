/** The generators' disk access, to test them without touching it. */
export abstract class FileSystem {
  abstract exists(path: string): Promise<boolean>;
  abstract read(path: string): Promise<string>;
  /** Writes the file and creates any missing folders. */
  abstract write(path: string, content: string): Promise<void>;
  /** Paths of all files under `root`, relative to it and with `/`, in alphabetical order. */
  abstract listFiles(root: string): Promise<string[]>;
}
