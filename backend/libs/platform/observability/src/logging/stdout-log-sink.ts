import { LogField } from './log-field.enum.js';
import { LogSink } from './log-sink.js';
import type { LogRecord } from './log-record.js';

/**
 * One JSON line per log. It is the destination when telemetry is off
 * (tests, scripts) and the one for Lambda and Fargate, where stdout reaches CloudWatch.
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
