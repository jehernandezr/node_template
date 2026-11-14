/** Carga un módulo de TypeScript por su ruta y devuelve sus exportaciones. */
export abstract class ModuleLoader {
  abstract load(path: string): Promise<Readonly<Record<string, unknown>>>;
}
