import { Injectable } from '@nestjs/common';
import { AppConfig } from '@platform/config';
import type { IdentityConfig } from './identity.config.js';

/** Identity's validated, typed configuration, to inject into adapters and use cases. */
@Injectable()
export class IdentitySettings {
  readonly values: IdentityConfig;

  constructor(config: AppConfig) {
    this.values = config.root<IdentityConfig>();
  }
}
