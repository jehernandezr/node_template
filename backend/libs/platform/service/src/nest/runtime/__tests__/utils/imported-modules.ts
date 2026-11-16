import type { DynamicModule } from '@nestjs/common';

/** Identifica los módulos que importa un `DynamicModule`, por su clase, sin importar si el import es dinámico. */
export class ImportedModules {
  static of(dynamic: DynamicModule): unknown[] {
    return (dynamic.imports ?? []).map((entry) =>
      ImportedModules.moduleOf(entry),
    );
  }

  /** El `DynamicModule` importado cuya clase es `moduleClass`, o `undefined` si no está. */
  static find(
    dynamic: DynamicModule,
    moduleClass: unknown,
  ): DynamicModule | undefined {
    return (dynamic.imports ?? []).find(
      (entry): entry is DynamicModule =>
        typeof entry === 'object' &&
        entry !== null &&
        'module' in entry &&
        entry.module === moduleClass,
    );
  }

  private static moduleOf(entry: unknown): unknown {
    if (typeof entry === 'object' && entry !== null && 'module' in entry) {
      return entry.module;
    }
    return entry;
  }
}
