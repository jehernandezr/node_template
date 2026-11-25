import type { DynamicModule } from '@nestjs/common';

/** Identifies the modules a `DynamicModule` imports, by their class, whether or not the import is dynamic. */
export class ImportedModules {
  static of(dynamic: DynamicModule): unknown[] {
    return (dynamic.imports ?? []).map((entry) =>
      ImportedModules.moduleOf(entry),
    );
  }

  /** The imported `DynamicModule` whose class is `moduleClass`, or `undefined` if it is not there. */
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
