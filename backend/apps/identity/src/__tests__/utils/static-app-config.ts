import { AppConfig } from '@platform/config';

/** `AppConfig` de prueba con las raíces que se le dan; no admite secciones. */
export class StaticAppConfig extends AppConfig {
  constructor(private readonly settings: unknown) {
    super();
  }

  get<T>(): T {
    throw new Error('StaticAppConfig solo expone la raíz');
  }

  root<T = unknown>(): T {
    return this.settings as T;
  }
}
