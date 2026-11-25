import { FileSystem } from '../../file-system.js';

/** In-memory disk: what the generators write stays here to be inspected. */
export class InMemoryFileSystem extends FileSystem {
  private readonly contents = new Map<string, string>();

  async exists(path: string): Promise<boolean> {
    return (
      this.contents.has(path) ||
      [...this.contents.keys()].some((file) => file.startsWith(`${path}/`))
    );
  }

  async read(path: string): Promise<string> {
    const content = this.contents.get(path);
    if (content === undefined) {
      throw new Error(`ENOENT: ${path}`);
    }
    return content;
  }

  async write(path: string, content: string): Promise<void> {
    this.contents.set(path, content);
  }

  async listFiles(root: string): Promise<string[]> {
    const prefix = `${root}/`;
    return [...this.contents.keys()]
      .filter((path) => path.startsWith(prefix))
      .map((path) => path.slice(prefix.length))
      .sort();
  }

  /** The written paths, in alphabetical order. */
  paths(): string[] {
    return [...this.contents.keys()].sort();
  }
}
