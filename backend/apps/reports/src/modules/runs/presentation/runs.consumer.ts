import { Injectable } from '@nestjs/common';
import { ExecuteRunCommand, type ExecuteRunPayload } from '@contracts/reports';
import { Subscribe } from '@platform/messaging/nest';
import { ExecuteRun } from '../application/execute-run.use-case.js';

/** `reports-runs` queue: the runs reports sends to itself. */
@Injectable()
export class RunsConsumer {
  constructor(private readonly executeRun: ExecuteRun) {}

  /**
   * Executes the run of the command.
   * @param data Tenant and run.
   */
  @Subscribe(ExecuteRunCommand)
  onExecute(data: ExecuteRunPayload): Promise<void> {
    return this.executeRun.execute(data);
  }
}
