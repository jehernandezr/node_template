import { Injectable } from '@nestjs/common';
import { AppConfig, RootSettings } from '@platform/config';
import type { TasksConfig } from './tasks.config.js';

/** Tasks's validated, typed configuration, to inject into use cases and adapters instead of `AppConfig`. */
@Injectable()
export class TasksSettings extends RootSettings<TasksConfig> {
  constructor(config: AppConfig) {
    super(config);
  }
}
