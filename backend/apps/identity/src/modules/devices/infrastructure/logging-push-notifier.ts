import { Injectable } from '@nestjs/common';
import { LoggerPort } from '@platform/observability';
import { PushNotifier } from '../domain/push-notifier.js';

/**
 * Push de prueba: deja constancia en el log sin enviar nada. La app consulta sus aprobaciones al abrirse;
 * el push real llega con `notifications`.
 */
@Injectable()
export class LoggingPushNotifier extends PushNotifier {
  constructor(private readonly logger: LoggerPort) {
    super();
  }

  async wake(deviceId: string): Promise<void> {
    this.logger.debug('device approval pending', { deviceId });
  }
}
