import { ModuleLoader } from '../../module-loader.js';

/** Loader that returns modules prepared by the test, indexed by path. */
export class FakeModuleLoader extends ModuleLoader {
  constructor(
    private readonly modules: Readonly<
      Record<string, Readonly<Record<string, unknown>>>
    >,
  ) {
    super();
  }

  override load(path: string): Promise<Readonly<Record<string, unknown>>> {
    const found = this.modules[path];
    return found
      ? Promise.resolve(found)
      : Promise.reject(new Error(`Module not prepared: ${path}`));
  }
}
