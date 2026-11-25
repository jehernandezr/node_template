import type { CallHandler } from '@nestjs/common';
import { of, type Observable } from 'rxjs';
import type { RequestContextData } from '../../../context/request-context-data.js';
import type { RequestContextStore } from '../../../context/request-context-store.js';

/** Handler that emits the request context current at the time of the call. */
export class RecordingCallHandler implements CallHandler {
  constructor(private readonly store: RequestContextStore) {}

  handle(): Observable<RequestContextData | undefined> {
    return of(this.store.current());
  }
}
