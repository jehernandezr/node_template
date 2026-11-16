import { Test, type TestingModule } from '@nestjs/testing';
import { PlatformRuntimeModule } from '../platform-runtime.module.js';
import { ServiceHostModule } from '../service-host.module.js';
import { ServiceOverridesModule } from '../service-overrides.module.js';
import { ServiceDefinitionBuilder } from '../../../__tests__/utils/index.js';
import { ImportedModules, OverrideToken } from './utils/index.js';

describe('ServiceHostModule', () => {
  describe('forService', () => {
    it('forwards the overrides to the overrides module', () => {
      const definition = ServiceDefinitionBuilder.aDefinition().build();

      const host = ServiceHostModule.forService(definition, {
        env: {},
        adapters: { valkey: false, aws: false },
        overrides: [{ provide: OverrideToken, useValue: 2 }],
      });

      expect(
        ImportedModules.find(host, ServiceOverridesModule)?.providers,
      ).toEqual([{ provide: OverrideToken, useValue: 2 }]);
    });

    it('imports the platform runtime, the overrides and the service root module', () => {
      const definition = ServiceDefinitionBuilder.aDefinition().build();

      const host = ServiceHostModule.forService(definition, {
        env: {},
        adapters: { valkey: false, aws: false },
      });

      const imports = host.imports ?? [];
      expect(imports).toHaveLength(3);
      expect(imports[0]).toMatchObject({ module: PlatformRuntimeModule });
      expect(imports[1]).toMatchObject({ module: ServiceOverridesModule });
      expect(imports[2]).toBe(definition.rootModule);
    });
  });

  describe('when the overrides provide a token', () => {
    let testing: TestingModule | undefined;

    afterEach(async () => {
      await testing?.close();
      testing = undefined;
    });

    it('makes the overridden provider available to the rest of the module', async () => {
      testing = await Test.createTestingModule({
        imports: [
          ServiceOverridesModule.of([{ provide: OverrideToken, useValue: 1 }]),
        ],
      }).compile();

      expect(testing.get(OverrideToken)).toBe(1);
    });
  });
});
