import { z } from 'zod';
import { ConfigLoader } from '../config-loader.js';
import { ConfigRegistry } from '../config-registry.js';
import { RegistryAppConfig } from '../registry-app-config.js';
import type { AppConfig } from '../app-config.js';
import { RootSettings } from '../root-settings.js';

const schema = z.object({ RETENTION_DAYS: z.coerce.number().int() });

class RetentionSettings extends RootSettings<z.output<typeof schema>> {
  constructor(config: AppConfig) {
    super(config);
  }
}

describe('RootSettings', () => {
  it('exposes the validated root values of the service', () => {
    const loader = new ConfigLoader({ RETENTION_DAYS: '30' });
    const registry = new ConfigRegistry();
    registry.setRoot(loader.load(schema));

    const settings = new RetentionSettings(
      new RegistryAppConfig(loader, registry),
    );

    expect(settings.values).toEqual({ RETENTION_DAYS: 30 });
  });

  it('fails at construction when the service declared no root schema', () => {
    const loader = new ConfigLoader({});

    expect(
      () =>
        new RetentionSettings(
          new RegistryAppConfig(loader, new ConfigRegistry()),
        ),
    ).toThrow();
  });
});
