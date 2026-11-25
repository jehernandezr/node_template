import { defineServiceContract, platformContract } from '@contracts/platform';
import { identityContract } from '@contracts/identity';
import { ContractsDiscovery } from '../contracts-discovery.js';
import { ExportPaths } from '../export-paths.js';
import { FakeModuleLoader } from './utils/fake-module-loader.js';
import { InMemoryFileSystem } from './utils/in-memory-file-system.js';

const paths = new ExportPaths('/backend');
const platformIndex = paths.contractIndexOf('platform');
const identityIndex = paths.contractIndexOf('identity');

describe('ContractsDiscovery', () => {
  describe('load', () => {
    it('returns the contracts in folder order, ignoring other exports and asyncapi.json', async () => {
      const fileSystem = new InMemoryFileSystem({
        [platformIndex]: '',
        [identityIndex]: '',
        [paths.asyncApi]: '{}',
      });
      const loader = new FakeModuleLoader({
        [platformIndex]: { platformContract, other: 1 },
        [identityIndex]: { identityContract, IdentityHelper: {} },
      });
      const registry = new ContractsDiscovery(paths, fileSystem, loader);

      const contracts = await registry.load();

      expect(contracts).toHaveLength(2);
      expect(contracts[0]).toBe(identityContract);
      expect(contracts[1]).toBe(platformContract);
    });

    it('discovers a new folder without registering it anywhere', async () => {
      const billingIndex = paths.contractIndexOf('billing');
      const billingContract = defineServiceContract({
        service: 'billing',
        description: 'Billing.',
      });
      const fileSystem = new InMemoryFileSystem({
        [platformIndex]: '',
        [identityIndex]: '',
        [billingIndex]: '',
        [paths.asyncApi]: '{}',
      });
      const loader = new FakeModuleLoader({
        [platformIndex]: { platformContract },
        [identityIndex]: { identityContract },
        [billingIndex]: { billingContract },
      });
      const registry = new ContractsDiscovery(paths, fileSystem, loader);

      const contracts = await registry.load();

      expect(contracts.map((contract) => contract.service)).toEqual([
        'billing',
        'identity',
        'platform',
      ]);
    });

    it('fails when a folder has only a file other than src/index.ts', async () => {
      const fileSystem = new InMemoryFileSystem({
        [platformIndex]: '',
        [identityIndex]: '',
        [`${paths.contractsDir}/billing/README.md`]: '',
      });
      const loader = new FakeModuleLoader({
        [platformIndex]: { platformContract },
        [identityIndex]: { identityContract },
      });
      const registry = new ContractsDiscovery(paths, fileSystem, loader);

      await expect(registry.load()).rejects.toThrow('src/index.ts is missing');
    });

    it.each<[string, Record<string, Readonly<Record<string, unknown>>>]>([
      [
        'a module without a contract',
        {
          [platformIndex]: { platformContract },
          [identityIndex]: { IdentityHelper: {} },
        },
      ],
      [
        'a module that exports the contract of another service',
        {
          [platformIndex]: { identity: identityContract },
          [identityIndex]: { identityContract },
        },
      ],
      [
        'a module with two contracts of the same service',
        {
          [platformIndex]: { platformContract, copy: platformContract },
          [identityIndex]: { identityContract },
        },
      ],
    ])('fails with %s', async (_label, modules) => {
      const fileSystem = new InMemoryFileSystem({
        [platformIndex]: '',
        [identityIndex]: '',
      });
      const registry = new ContractsDiscovery(
        paths,
        fileSystem,
        new FakeModuleLoader(modules),
      );

      await expect(registry.load()).rejects.toThrow(
        'must export exactly one contract',
      );
    });
  });
});
