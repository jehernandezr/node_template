import type { Logger } from '@opentelemetry/api';

type EmittedRecord = Parameters<Logger['emit']>[0];

/** Logger OTel que guarda los registros emitidos, para pruebas. */
export class FakeOtelLogger implements Logger {
  readonly emitted: EmittedRecord[] = [];

  enabled(): boolean {
    return true;
  }

  emit(logRecord: EmittedRecord): void {
    this.emitted.push(logRecord);
  }
}
