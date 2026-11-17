import { Injectable } from '@nestjs/common';
import { AppConfig } from '@platform/config';
import type { IdentityConfig } from './identity.config.js';

/** La configuración validada de identity, tipada, para inyectarla en los adaptadores y casos de uso. */
@Injectable()
export class IdentitySettings {
  readonly values: IdentityConfig;

  constructor(config: AppConfig) {
    this.values = config.root<IdentityConfig>();
  }
}
