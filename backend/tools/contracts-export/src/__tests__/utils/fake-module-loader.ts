import { ModuleLoader } from '../../module-loader.js';

/** Cargador que devuelve módulos preparados por la prueba, indexados por ruta. */
export class FakeModuleLoader extends ModuleLoader {
  constructor(
    private readonly modules: Readonly<
      Record<string, Readonly<Record<string, unknown>>>
    >,
  ) {
    super();
  }

  load(path: string): Promise<Readonly<Record<string, unknown>>> {
    const found = this.modules[path];
    return found
      ? Promise.resolve(found)
      : Promise.reject(new Error(`Módulo no preparado: ${path}`));
  }
}
