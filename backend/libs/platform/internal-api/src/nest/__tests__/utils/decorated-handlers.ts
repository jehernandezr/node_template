import { Injectable } from '@nestjs/common';
import { CallOutcome } from '@platform/primitives';
import { InternalHandler } from '../../internal-handler.decorator.js';
import type { HandlerInputOf } from '../../../contract/operation-io.type.js';
import type { HandlerResult } from '../../../server/handler-result.js';
import { ExplorerOperations } from './explorer-operations.js';

/** Provider con métodos decorados que cuentan sus llamadas. */
@Injectable()
export class DecoratedHandlers {
  countCalls = 0;
  echoCalls = 0;

  @InternalHandler(ExplorerOperations.Count)
  count(): Promise<HandlerResult<unknown>> {
    this.countCalls += 1;
    return Promise.resolve({ outcome: CallOutcome.success({ total: 3 }) });
  }

  @InternalHandler(ExplorerOperations.Echo)
  echo(
    input: HandlerInputOf<typeof ExplorerOperations.Echo>,
  ): Promise<HandlerResult<unknown>> {
    this.echoCalls += 1;
    return Promise.resolve({
      outcome: CallOutcome.success({ sku: input.sku }),
    });
  }
}
