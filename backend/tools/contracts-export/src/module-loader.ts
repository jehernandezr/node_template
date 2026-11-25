/** Loads a TypeScript module by its path and returns its exports. */
export abstract class ModuleLoader {
  abstract load(path: string): Promise<Readonly<Record<string, unknown>>>;
}
