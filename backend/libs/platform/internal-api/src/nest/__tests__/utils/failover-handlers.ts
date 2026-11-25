import { Injectable } from '@nestjs/common';
import type { HandlerResult } from '../../../server/handler-result.js';
import { InternalHandler } from '../../internal-handler.decorator.js';
import { E2eOperations } from './e2e-operations.js';

/** Handler that fails like a query during a database failover: the error carries the SQLSTATE in `code`. */
@Injectable()
export class FailoverHandlers {
  static readonly ADMIN_SHUTDOWN = '57P01';

  @InternalHandler(E2eOperations.Greet)
  greet(): Promise<HandlerResult<{ greeting: string }>> {
    return Promise.reject(
      Object.assign(
        new Error('terminating connection due to administrator command'),
        {
          name: 'QueryFailedError',
          code: FailoverHandlers.ADMIN_SHUTDOWN,
        },
      ),
    );
  }
}
