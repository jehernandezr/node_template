/** Loads a TypeScript module by its path and returns its exports. */
export abstract class ModuleLoader {
  /**
   * Imports a module by path.
   * @param path Module path.
   * @returns Its exports.
   */
  abstract load(path: string): Promise<Readonly<Record<string, unknown>>>;
}
