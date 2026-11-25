import { GeneratorErrorReason } from '../generator-error.js';
import { GeneratorWorkspace } from './utils/index.js';

describe('ServiceGenerator', () => {
  it('creates the app, its contract and its dev tfvars with the name of the service', async () => {
    const workspace = new GeneratorWorkspace();

    await workspace.services.generate('stock-items');

    const paths = workspace.backend.paths();
    expect(paths).toEqual(
      expect.arrayContaining(
        [
          'apps/stock-items/project.json',
          'apps/stock-items/src/main.ts',
          'apps/stock-items/src/stock-items.service.ts',
          'apps/stock-items/src/app.module.ts',
          'apps/stock-items/src/database/stock-items-tenant-move.manifest.ts',
          'libs/contracts/stock-items/src/contract.ts',
          'infra/terraform/environments/dev/services/stock-items/terraform.tfvars',
        ].map((path) => `${GeneratorWorkspace.BACKEND}/${path}`),
      ),
    );
    await expect(
      workspace.file('apps/stock-items/src/stock-items.service.ts'),
    ).resolves.toContain(
      'export const stockItemsService: ServiceDefinition<StockItemsConfig>',
    );
    await expect(
      workspace.file('libs/contracts/stock-items/src/contract.ts'),
    ).resolves.toContain("defineTenantMoveOperations('stock-items')");
    for (const path of paths) {
      await expect(workspace.backend.read(path)).resolves.not.toMatch(
        /__(name|Name|NAME|nameCamel|name_snake|service)__/,
      );
    }
  });

  it('tells which lines of the shared files to add by hand', async () => {
    const lines = await new GeneratorWorkspace().services.generate(
      'stock-items',
    );

    expect(lines.join('\n')).toEqual(
      expect.stringContaining(
        '"@contracts/stock-items": ["./libs/contracts/stock-items/src/index.ts"]',
      ),
    );
    expect(lines.join('\n')).toContain('stock_items_shard_0');
    expect(lines.join('\n')).toContain('StockItemsTenantMoveOperations in ALL');
  });

  it('writes nothing over a service that already exists', async () => {
    const workspace = new GeneratorWorkspace();
    await workspace.backend.write(
      `${GeneratorWorkspace.BACKEND}/apps/stock-items/src/main.ts`,
      'existing',
    );

    await expect(
      workspace.services.generate('stock-items'),
    ).rejects.toMatchObject({ reason: GeneratorErrorReason.AlreadyExists });
    expect(workspace.backend.paths()).toEqual([
      `${GeneratorWorkspace.BACKEND}/apps/stock-items/src/main.ts`,
    ]);
    await expect(workspace.file('apps/stock-items/src/main.ts')).resolves.toBe(
      'existing',
    );
  });
});
