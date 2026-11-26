import { ErrorDescriptor } from '@platform/kernel';
import type { ResilienceEventDetail } from './resilience-event.js';

/** Extracts from the error only the fields that are safe to log. */
export class ErrorEventDetail {
  /**
   * Name and code of the error; the code only if it has the shape `SERVICE.SUBMODULE.ERROR`.
   * @param error Error of the call.
   * @returns Its name and code.
   */
  static of(
    error: unknown,
  ): Pick<ResilienceEventDetail, 'errorName' | 'errorCode'> {
    const description = ErrorDescriptor.describe(error);
    return { errorName: description.name, errorCode: description.code };
  }
}
