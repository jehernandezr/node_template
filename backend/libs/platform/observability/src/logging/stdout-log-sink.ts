import { LogField } from './log-field.enum.js';
import { LogSink } from './log-sink.js';
import type { LogRecord } from './log-record.js';

/**
 * Una línea JSON por log. Es el destino cuando la telemetría está apagada
 * (pruebas, scripts) y el de Lambda y Fargate, donde stdout llega a CloudWatch.
 */
export class StdoutLogSink extends LogSink {
  constructor(
    private readonly output: (line: string) => void = (line) => {
      process.stdout.write(`${line}\n`);
    },
  ) {
    super();
  }

  write(record: LogRecord): void {
    this.output(
      JSON.stringify({
        ...record.fields,
        [LogField.Timestamp]: record.timestamp.toISOString(),
        [LogField.Level]: record.level,
        [LogField.Service]: record.service,
        [LogField.Context]: record.context,
        [LogField.Message]: record.message,
      }),
    );
  }
}
