import { AppConfig } from '@platform/config';

/** Test `AppConfig` with the given roots; it does not support sections. */
export class StaticAppConfig extends AppConfig {
  constructor(private readonly settings: unknown) {
    super();
  }

  get<T>(): T {
    throw new Error('StaticAppConfig only exposes the root');
  }

  root<T = unknown>(): T {
    return this.settings as T;
  }
}
