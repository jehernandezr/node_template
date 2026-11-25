import { Injectable } from '@nestjs/common';
import { CallOutcome } from '@platform/primitives';
import { InternalHandler } from '../../internal-handler.decorator.js';
import type { HandlerResult } from '../../../server/handler-result.js';
import { ExplorerOperations } from './explorer-operations.js';

/** Provider with two methods that handle the same operation. */
@Injectable()
export class DuplicateHandlers {
  @InternalHandler(ExplorerOperations.Count)
  first(): Promise<HandlerResult<unknown>> {
    return Promise.resolve({ outcome: CallOutcome.success({ total: 1 }) });
  }

  @InternalHandler(ExplorerOperations.Count)
  second(): Promise<HandlerResult<unknown>> {
    return Promise.resolve({ outcome: CallOutcome.success({ total: 2 }) });
  }
}
