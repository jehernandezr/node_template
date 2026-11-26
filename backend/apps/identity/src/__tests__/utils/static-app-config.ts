import { AppConfig } from '@platform/config';

/** Test `AppConfig` with the given roots; it does not support sections. */
export class StaticAppConfig extends AppConfig {
  constructor(private readonly settings: unknown) {
    super();
  }

  override get<T>(): T {
    throw new Error('StaticAppConfig only exposes the root');
  }

  override root<T = unknown>(): T {
    return this.settings as T;
  }
}
