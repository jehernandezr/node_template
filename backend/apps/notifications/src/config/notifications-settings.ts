import { Injectable } from '@nestjs/common';
import { AppConfig, RootSettings } from '@platform/config';
import type { NotificationsConfig } from './notifications.config.js';

/** Notifications's validated, typed configuration, to inject into use cases and adapters instead of `AppConfig`. */
@Injectable()
export class NotificationsSettings extends RootSettings<NotificationsConfig> {
  constructor(config: AppConfig) {
    super(config);
  }
}
