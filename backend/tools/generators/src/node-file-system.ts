import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { FileSystem } from './file-system.js';

export class NodeFileSystem extends FileSystem {
  override async exists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  override read(path: string): Promise<string> {
    return readFile(path, 'utf8');
  }

  override async write(path: string, content: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }

  override async listFiles(root: string): Promise<string[]> {
    const entries = await readdir(root, {
      recursive: true,
      withFileTypes: true,
    });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) =>
        relative(root, join(entry.parentPath, entry.name)).split(sep).join('/'),
      )
      .sort();
  }
}
