import { ProbeErrorName } from './probe-error-name.enum.js';

/** Simulated connection error. Its message carries connection data, which must never appear in the health report. */
export class ConnectionFailedError extends Error {
  override readonly name = ProbeErrorName.Connection;

  constructor() {
    super('connection refused by postgres.internal:5432');
  }
}
