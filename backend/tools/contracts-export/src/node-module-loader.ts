import { pathToFileURL } from 'node:url';
import { ModuleLoader } from './module-loader.js';

/** `ModuleLoader` with Node dynamic imports. */
export class NodeModuleLoader extends ModuleLoader {
  override load(path: string): Promise<Readonly<Record<string, unknown>>> {
    return import(pathToFileURL(path).href) as Promise<
      Readonly<Record<string, unknown>>
    >;
  }
}
