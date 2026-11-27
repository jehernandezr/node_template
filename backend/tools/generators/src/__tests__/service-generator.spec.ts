import { GeneratorErrorReason } from '../generator-error.js';
import { GeneratorWorkspace } from './utils/index.js';

describe('ServiceGenerator', () => {
  it('creates the app, its contract and the dev tfvars of its two stacks with the name of the service', async () => {
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
          'infra/terraform/environments/dev/services/stock-items/backend.tfvars',
          'infra/terraform/environments/dev/services/stock-items/base/terraform.tfvars',
          'infra/terraform/environments/dev/services/stock-items/base/backend.tfvars',
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
    expect(lines.join('\n')).toContain(
      'listener-priorities.json: "stock_items"',
    );
    expect(lines.join('\n')).toContain(
      'stock_items in db_services and in valkey_services',
    );
    expect(lines.join('\n')).toContain('"stock-items" in services');
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

  describe('with a two-word name', () => {
    const SERVICE = 'order-history';
    const VALUES = `infra/terraform/environments/dev/services/${SERVICE}`;
    const FILES = [
      'terraform.tfvars',
      'backend.tfvars',
      'base/terraform.tfvars',
      'base/backend.tfvars',
    ];
    const SERVICE_NAME_RULE = /can\(regex\("([^"]+)", var\.service_name\)\)/;

    const generated = async (): Promise<GeneratorWorkspace> => {
      const workspace = new GeneratorWorkspace();
      await workspace.services.generate(SERVICE);
      return workspace;
    };

    it('keeps the folder in kebab-case and writes service_name and the state keys in snake_case', async () => {
      const workspace = await generated();

      for (const file of ['terraform.tfvars', 'base/terraform.tfvars']) {
        await expect(workspace.file(`${VALUES}/${file}`)).resolves.toContain(
          'service_name = "order_history"',
        );
      }
      await expect(
        workspace.file(`${VALUES}/backend.tfvars`),
      ).resolves.toContain(
        'key          = "us-east-1/services/order_history/terraform.tfstate"',
      );
      await expect(
        workspace.file(`${VALUES}/base/backend.tfvars`),
      ).resolves.toContain(
        'key          = "us-east-1/services/order_history/base/terraform.tfstate"',
      );
      await expect(
        workspace.file(`${VALUES}/terraform.tfvars`),
      ).resolves.toContain('route_prefixes    = ["/v1/order-history"]');
    });

    it('passes the service_name validation of both service stacks', async () => {
      const workspace = await generated();
      const serviceName = /^service_name = "([^"]+)"$/m.exec(
        await workspace.file(`${VALUES}/base/terraform.tfvars`),
      )?.[1];

      for (const stack of ['service-base', 'service']) {
        const rule = SERVICE_NAME_RULE.exec(
          await GeneratorWorkspace.repositoryFile(
            `infra/terraform/stacks/${stack}/variables.tf`,
          ),
        )?.[1];
        expect(rule).toBeDefined();
        expect(serviceName).toMatch(new RegExp(rule ?? '$^'));
      }
    });

    it('renders the values that tf-validate plans as a generated service', async () => {
      const workspace = await generated();

      for (const file of FILES) {
        await expect(workspace.file(`${VALUES}/${file}`)).resolves.toBe(
          await GeneratorWorkspace.repositoryFile(
            `infra/scripts/__tests__/utils/fixtures/generated-service/${SERVICE}/${file}`,
          ),
        );
      }
    });
  });
});
