import { Injectable } from '@nestjs/common';
import { AppConfig, RootSettings } from '@platform/config';
import type { BillingConfig } from './billing.config.js';

/** Billing's validated, typed configuration, to inject into use cases and adapters instead of `AppConfig`. */
@Injectable()
export class BillingSettings extends RootSettings<BillingConfig> {
  constructor(config: AppConfig) {
    super(config);
  }
}
