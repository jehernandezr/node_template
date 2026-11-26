import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Type } from '@nestjs/common';
import {
  GLOBAL_MODULE_METADATA,
  MODULE_METADATA,
} from '@nestjs/common/constants.js';
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

  it('are not global: each one imports the modules whose facades it uses', () => {
    const globals = modules.filter(
      (module) =>
        Reflect.getMetadata(GLOBAL_MODULE_METADATA, module.type) === true,
    );

    expect(globals.map((module) => module.type.name)).toEqual([]);
  });

  it('keep the core modules importing only other core modules or the alerts', () => {
    const business = new Map(modules.map((module) => [module.type, module]));
    const crossings = modules
      .filter((module) => module.core)
      .flatMap((module) =>
        (
          (Reflect.getMetadata(MODULE_METADATA.IMPORTS, module.type) as
            unknown[] | undefined) ?? []
        )
          .map((imported) => business.get(imported as Type<unknown>))
          .filter(
            (imported): imported is BusinessModule =>
              imported !== undefined &&
              !imported.core &&
              imported.type !== AlertsModule,
          )
          .map((imported) => `${module.type.name} -> ${imported.type.name}`),
      );

    expect(crossings).toEqual([]);
  });
});
