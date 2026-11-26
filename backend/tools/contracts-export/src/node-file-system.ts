import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { FileSystem } from './file-system.js';

/** `FileSystem` over the Node file system. */
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

  override async listDirectories(path: string): Promise<string[]> {
    const entries = await readdir(path, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  }
}
