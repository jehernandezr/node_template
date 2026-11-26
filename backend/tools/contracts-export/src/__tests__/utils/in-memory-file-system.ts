import { FileSystem } from '../../file-system.js';

/** In-memory disk to test the export without touching files. */
export class InMemoryFileSystem extends FileSystem {
  private readonly files = new Map<string, string>();

  constructor(initial: Readonly<Record<string, string>> = {}) {
    super();
    for (const [path, content] of Object.entries(initial)) {
      this.files.set(path, content);
    }
  }

  override exists(path: string): Promise<boolean> {
    return Promise.resolve(this.files.has(path));
  }

  override read(path: string): Promise<string> {
    const content = this.files.get(path);
    return content === undefined
      ? Promise.reject(new Error(`${path} does not exist`))
      : Promise.resolve(content);
  }

  override write(path: string, content: string): Promise<void> {
    this.files.set(path, content);
    return Promise.resolve();
  }

  override listDirectories(path: string): Promise<string[]> {
    const prefix = `${path}/`;
    const names = new Set<string>();
    for (const file of this.files.keys()) {
      const rest = file.startsWith(prefix) ? file.slice(prefix.length) : '';
      const slash = rest.indexOf('/');
      if (slash > 0) names.add(rest.slice(0, slash));
    }
    return Promise.resolve([...names].sort());
  }

  /** Current content, or undefined if the file does not exist. */
  contentOf(path: string): string | undefined {
    return this.files.get(path);
  }
}
