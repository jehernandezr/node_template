import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { DynamicModule, ForwardReference, Type } from '@nestjs/common';
import {
  GLOBAL_MODULE_METADATA,
  MODULE_METADATA,
} from '@nestjs/common/constants.js';
import { AppModule } from '../app.module.js';
import { AlertsModule } from '../modules/alerts/presentation/alerts.module.js';

/** A business module found in `modules/<name>/presentation/<file>.module.ts`. */
interface BusinessModule {
  readonly type: Type<unknown>;
  readonly core: boolean;
}

/** Discovers every module class under `modules/<name>/presentation`, so a new one is checked without listing it. */
class BusinessModules {
  private static readonly MODULES_DIR = join(__dirname, '..', 'modules');
  private static readonly MODULE_FILE = /\.module\.ts$/;
  private static readonly CORE_FILE = /-core\.module\.ts$/;

  /** Loads the module files and returns their exported module classes. */
  static async load(): Promise<BusinessModule[]> {
    const found: BusinessModule[] = [];
    for (const name of readdirSync(BusinessModules.MODULES_DIR)) {
      const presentation = join(
        BusinessModules.MODULES_DIR,
        name,
        'presentation',
      );
      for (const file of BusinessModules.moduleFiles(presentation)) {
        const exported = (await import(join(presentation, file))) as Record<
          string,
          unknown
        >;
        for (const value of Object.values(exported)) {
          if (BusinessModules.isModule(value)) {
            found.push({
              type: value,
              core: BusinessModules.CORE_FILE.test(file),
            });
          }
        }
      }
    }
    return found;
  }

  private static moduleFiles(presentation: string): string[] {
    try {
      return readdirSync(presentation).filter((file) =>
        BusinessModules.MODULE_FILE.test(file),
      );
    } catch {
      return [];
    }
  }

  private static isModule(value: unknown): value is Type<unknown> {
    const moduleKeys: readonly string[] = Object.values(MODULE_METADATA);
    return (
      typeof value === 'function' &&
      Reflect.getMetadataKeys(value).some((key) =>
        moduleKeys.includes(String(key)),
      )
    );
  }
}

/** A module import resolved to its class, whether it is global and the imports it brings. */
interface ResolvedImport {
  readonly type: Type<unknown>;
  readonly global: boolean;
  readonly imports: readonly unknown[];
}

/** Resolves module imports as Nest accepts them: a class, a dynamic module, a forward reference or a promise of one. */
class ModuleImports {
  /** Resolves one import entry, or returns `undefined` when it is not a module. */
  static async resolve(entry: unknown): Promise<ResolvedImport | undefined> {
    const awaited: unknown = await entry;
    if (ModuleImports.isForwardReference(awaited)) {
      return ModuleImports.resolve(awaited.forwardRef());
    }
    if (typeof awaited === 'function') {
      const type = awaited as Type<unknown>;
      return {
        type,
        global: ModuleImports.isGlobal(type),
        imports: ModuleImports.declaredImports(type),
      };
    }
    if (ModuleImports.isDynamicModule(awaited)) {
      return {
        type: awaited.module,
        global:
          awaited.global === true || ModuleImports.isGlobal(awaited.module),
        imports: [
          ...ModuleImports.declaredImports(awaited.module),
          ...(awaited.imports ?? []),
        ],
      };
    }
    return undefined;
  }

  /** Resolves every module reachable from `root`, each class or dynamic module once. */
  static async reachableFrom(root: Type<unknown>): Promise<ResolvedImport[]> {
    const seen = new Set<unknown>();
    const found: ResolvedImport[] = [];
    const pending: unknown[] = [root];
    while (pending.length > 0) {
      const entry = await ModuleImports.unwrap(pending.pop());
      if (seen.has(entry)) {
        continue;
      }
      seen.add(entry);
      const resolved = await ModuleImports.resolve(entry);
      if (resolved !== undefined) {
        found.push(resolved);
        pending.push(...resolved.imports);
      }
    }
    return found;
  }

  private static async unwrap(entry: unknown): Promise<unknown> {
    const awaited: unknown = await entry;
    return ModuleImports.isForwardReference(awaited)
      ? ModuleImports.unwrap(awaited.forwardRef())
      : awaited;
  }

  private static declaredImports(type: Type<unknown>): readonly unknown[] {
    return (
      (Reflect.getMetadata(MODULE_METADATA.IMPORTS, type) as
        unknown[] | undefined) ?? []
    );
  }

  private static isGlobal(type: Type<unknown>): boolean {
    return Reflect.getMetadata(GLOBAL_MODULE_METADATA, type) === true;
  }

  private static isForwardReference(
    value: unknown,
  ): value is ForwardReference<() => unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as Partial<ForwardReference>).forwardRef === 'function'
    );
  }

  private static isDynamicModule(value: unknown): value is DynamicModule {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as Partial<DynamicModule>).module === 'function'
    );
  }
}

describe('identity business modules', () => {
  let modules: BusinessModule[];

  beforeAll(async () => {
    modules = await BusinessModules.load();
  });

  it('finds every business module and its core modules', () => {
    expect(modules.length).toBeGreaterThanOrEqual(22);
    expect(
      modules.filter((module) => module.core).length,
    ).toBeGreaterThanOrEqual(7);
  });

  it('are not global: each one imports the modules whose facades it uses', async () => {
    const business = new Set(modules.map((module) => module.type));
    const globals = (await ModuleImports.reachableFrom(AppModule))
      .filter((module) => business.has(module.type) && module.global)
      .map((module) => module.type.name);

    expect(globals).toEqual([]);
  });

  it('keep the core modules importing only other core modules or the alerts', async () => {
    const business = new Map(modules.map((module) => [module.type, module]));
    const crossings: string[] = [];
    for (const module of modules.filter((candidate) => candidate.core)) {
      const declared =
        (Reflect.getMetadata(MODULE_METADATA.IMPORTS, module.type) as
          unknown[] | undefined) ?? [];
      for (const entry of declared) {
        const imported = business.get(
          (await ModuleImports.resolve(entry))?.type as Type<unknown>,
        );
        if (
          imported !== undefined &&
          !imported.core &&
          imported.type !== AlertsModule
        ) {
          crossings.push(`${module.type.name} -> ${imported.type.name}`);
        }
      }
    }

    expect(crossings).toEqual([]);
  });
});
