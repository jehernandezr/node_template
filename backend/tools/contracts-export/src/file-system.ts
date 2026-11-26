/** Disk access the export needs, so it can be tested without touching it. */
export abstract class FileSystem {
  /**
   * Tells whether a path exists.
   * @param path Path to check.
   * @returns `true` when it exists.
   */
  abstract exists(path: string): Promise<boolean>;
  /**
   * Reads a text file.
   * @param path File to read.
   * @returns Its content.
   */
  abstract read(path: string): Promise<string>;
  /**
   * Writes the file and creates any missing folders.
   * @param path File to write.
   * @param content Text to write.
   */
  abstract write(path: string, content: string): Promise<void>;
  /**
   * Names of the direct subdirectories, in alphabetical order.
   * @param path Folder to list.
   * @returns The subdirectory names.
   */
  abstract listDirectories(path: string): Promise<string[]>;
}
