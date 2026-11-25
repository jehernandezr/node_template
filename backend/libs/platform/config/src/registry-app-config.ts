import { AppConfig } from './app-config.js';
import type { ConfigLoader } from './config-loader.js';
import type { ConfigRegistry } from './config-registry.js';
import type { ConfigSection } from './config-section.js';
import { ConfigValidationError } from './errors/config-validation.error.js';

/**
 * `AppConfig` over the registry. A section nobody has loaded yet is validated
 * and stored on the first `get`, so the instantiation order of the modules
 * does not matter.
 */
export class RegistryAppConfig extends AppConfig {
  constructor(
    private readonly loader: ConfigLoader,
    private readonly registry: ConfigRegistry,
  ) {
    super();
  }

  get<T>(section: ConfigSection<T>): T {
    const found = this.registry.find(section);
    if (found !== undefined) {
      return found;
    }
    this.registry.register(section, this.loader.loadSection(section));
    return this.registry.find(section) as T;
  }

  root<T = unknown>(): T {
    const value = this.registry.root();
    if (value === undefined) {
      throw new ConfigValidationError([
        {
          path: '(root)',
          code: 'custom',
          message: 'no root schema configured',
        },
      ]);
    }
    return value as T;
  }
}
