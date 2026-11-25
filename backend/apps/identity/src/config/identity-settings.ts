import { Injectable } from '@nestjs/common';
import { AppConfig, RootSettings } from '@platform/config';
import type { IdentityConfig } from './identity.config.js';

/** Identity's validated, typed configuration, to inject into use cases and adapters instead of `AppConfig`. */
@Injectable()
export class IdentitySettings extends RootSettings<IdentityConfig> {
  constructor(config: AppConfig) {
    super(config);
  }
}
