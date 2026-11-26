import { Injectable } from '@nestjs/common';
import { LoggerPort } from '@platform/observability';
import { PushNotifier } from '../domain/push-notifier.js';

/**
 * Test push: records it in the log without sending anything. The app checks its approvals when it opens;
 * the real push comes with `notifications`.
 */
@Injectable()
export class LoggingPushNotifier extends PushNotifier {
  constructor(private readonly logger: LoggerPort) {
    super();
  }

  override async wake(deviceId: string): Promise<void> {
    this.logger.debug('device approval pending', { deviceId });
  }
}
