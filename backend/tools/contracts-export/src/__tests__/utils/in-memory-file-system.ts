import { FileSystem } from '../../file-system.js';

/** Disco en memoria para probar la exportación sin tocar archivos. */
export class InMemoryFileSystem extends FileSystem {
  private readonly files = new Map<string, string>();

  constructor(initial: Readonly<Record<string, string>> = {}) {
    super();
    for (const [path, content] of Object.entries(initial)) {
      this.files.set(path, content);
    }
  }

  exists(path: string): Promise<boolean> {
    return Promise.resolve(this.files.has(path));
  }

  read(path: string): Promise<string> {
    const content = this.files.get(path);
    return content === undefined
      ? Promise.reject(new Error(`No existe ${path}`))
      : Promise.resolve(content);
  }

  write(path: string, content: string): Promise<void> {
    this.files.set(path, content);
    return Promise.resolve();
  }

  listDirectories(path: string): Promise<string[]> {
    const prefix = `${path}/`;
    const names = new Set<string>();
    for (const file of this.files.keys()) {
      const rest = file.startsWith(prefix) ? file.slice(prefix.length) : '';
      const slash = rest.indexOf('/');
      // Un archivo directo de la carpeta no es un subdirectorio.
      if (slash > 0) names.add(rest.slice(0, slash));
    }
    return Promise.resolve([...names].sort());
  }

  /** Contenido actual, o undefined si el archivo no existe. */
  contentOf(path: string): string | undefined {
    return this.files.get(path);
  }
}
