import { GeneratorErrorReason } from '../generator-error.js';
import { GeneratorWorkspace } from './utils/index.js';

const MODULE_ROOT = 'apps/inventory/src/modules/stock-items';

describe('ModuleGenerator', () => {
  let workspace: GeneratorWorkspace;

  beforeEach(async () => {
    workspace = new GeneratorWorkspace();
    await workspace.services.generate('inventory');
  });

  it('creates the layers of the module with its facade and a fake of it', async () => {
    await workspace.modules.generate('inventory', 'stock-items');

    expect(workspace.backend.paths()).toEqual(
      expect.arrayContaining(
        [
          `${MODULE_ROOT}/index.ts`,
          `${MODULE_ROOT}/module.ts`,
          `${MODULE_ROOT}/domain/.gitkeep`,
          `${MODULE_ROOT}/application/stock-items.facade.ts`,
          `${MODULE_ROOT}/infrastructure/persistence/migrations/index.ts`,
          `${MODULE_ROOT}/presentation/stock-items.module.ts`,
          `${MODULE_ROOT}/__tests__/utils/fake-stock-items.facade.ts`,
        ].map((path) => `${GeneratorWorkspace.BACKEND}/${path}`),
      ),
    );
    await expect(
      workspace.file(
        `${MODULE_ROOT}/__tests__/utils/fake-stock-items.facade.ts`,
      ),
    ).resolves.toContain(
      'export class FakeStockItemsFacade extends StockItemsFacade {}',
    );
  });

  it('exposes the facade in the index and the Nest module apart, so loading a facade never loads a module', async () => {
    await workspace.modules.generate('inventory', 'stock-items');

    await expect(
      workspace.file(`${MODULE_ROOT}/index.ts`),
    ).resolves.not.toContain('StockItemsModule');
    await expect(workspace.file(`${MODULE_ROOT}/module.ts`)).resolves.toContain(
      "export { StockItemsModule } from './presentation/stock-items.module.js';",
    );
  });

  it('registers the module in the app and its migrations in the shard list, keeping the markers', async () => {
    await workspace.modules.generate('inventory', 'stock-items');

    const app = await workspace.file('apps/inventory/src/app.module.ts');
    const migrations = await workspace.file(
      'apps/inventory/src/database/shard-migrations.ts',
    );
    expect(app).toContain(
      "import { StockItemsModule } from './modules/stock-items/module.js';\n// generated:modules:imports",
    );
    expect(app).toContain('    StockItemsModule,\n    // generated:modules');
    expect(migrations).toContain(
      '  ...stockItemsModuleShardMigrations,\n  // generated:modules',
    );
  });

  it('gives each new module the next block of migration timestamps', async () => {
    await workspace.modules.generate('inventory', 'stock-items');
    await workspace.modules.generate('inventory', 'suppliers');

    const ranges = await workspace.file(
      'apps/inventory/src/shared/constants/migration-ranges.constants.ts',
    );
    expect(ranges).toContain(
      '  StockItems = 1_797_000_100_000,\n  Suppliers = 1_797_000_200_000,\n  // generated:modules',
    );
  });

  it('refuses a service that does not exist', async () => {
    await expect(
      workspace.modules.generate('warehouse', 'stock-items'),
    ).rejects.toMatchObject({ reason: GeneratorErrorReason.MissingService });
  });

  it('writes nothing when the service lost a marker', async () => {
    const app = `${GeneratorWorkspace.BACKEND}/apps/inventory/src/app.module.ts`;
    await workspace.backend.write(
      app,
      '@Module({})\nexport class AppModule {}\n',
    );
    const before = workspace.backend.paths();

    await expect(
      workspace.modules.generate('inventory', 'stock-items'),
    ).rejects.toMatchObject({ reason: GeneratorErrorReason.MissingMarker });
    expect(workspace.backend.paths()).toEqual(before);
  });

  it('refuses a module that already exists', async () => {
    await workspace.modules.generate('inventory', 'stock-items');

    await expect(
      workspace.modules.generate('inventory', 'stock-items'),
    ).rejects.toMatchObject({ reason: GeneratorErrorReason.AlreadyExists });
  });
});
