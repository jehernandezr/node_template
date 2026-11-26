import type { INestApplicationContext } from '@nestjs/common';
import { ServiceShutdownTimeoutError } from '../../errors/service-shutdown-timeout.error.js';

/** Address an HTTP process listens on. */
export interface ServiceAddress {
  readonly host: string;
  readonly port: number;
}

/** A started service. Its shutdown is orderly and bounded by the grace period. */
export class RunningService {
  private stopping: Promise<void> | undefined;

  constructor(
    readonly name: string,
    readonly app: INestApplicationContext,
    private readonly graceMs: number,
    readonly address?: ServiceAddress,
  ) {}

  /**
   * Closes the application: stops accepting, waits for what is in progress, stops jobs and consumers
   * and closes persistence, Valkey and telemetry. Calling it several times returns the same shutdown.
   * @throws ServiceShutdownTimeoutError if it does not finish within `graceMs`.
   */
  stop(): Promise<void> {
    if (this.stopping === undefined) {
      this.stopping = this.closeWithin();
    }
    return this.stopping;
  }

  /**
   * Without this, a pending timer would keep the process alive after closing.
   */
  private async closeWithin(): Promise<void> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(new ServiceShutdownTimeoutError(this.name, this.graceMs));
      }, this.graceMs);
    });
    try {
      await Promise.race([this.app.close(), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }
}
