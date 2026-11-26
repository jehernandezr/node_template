import { Injectable } from '@nestjs/common';
import { AppConfig, RootSettings } from '@platform/config';
import type { ReportsConfig } from './reports.config.js';

/** Reports's validated, typed configuration, to inject into use cases and adapters instead of `AppConfig`. */
@Injectable()
export class ReportsSettings extends RootSettings<ReportsConfig> {
  constructor(config: AppConfig) {
    super(config);
  }
}
