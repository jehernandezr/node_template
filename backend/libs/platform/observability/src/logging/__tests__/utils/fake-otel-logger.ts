import type { Logger } from '@opentelemetry/api';

type EmittedRecord = Parameters<Logger['emit']>[0];

/** OTel logger that stores the emitted records, for tests. */
export class FakeOtelLogger implements Logger {
  readonly emitted: EmittedRecord[] = [];

  enabled(): boolean {
    return true;
  }

  emit(logRecord: EmittedRecord): void {
    this.emitted.push(logRecord);
  }
}
