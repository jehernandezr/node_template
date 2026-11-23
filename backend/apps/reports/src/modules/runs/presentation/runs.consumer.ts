import { Injectable } from '@nestjs/common';
import { ExecuteRunCommand, type ExecuteRunPayload } from '@contracts/reports';
import { Subscribe } from '@platform/messaging/nest';
import { ExecuteRun } from '../application/execute-run.use-case.js';

/** Cola `reports-runs`: las ejecuciones que reports se envía a sí mismo. */
@Injectable()
export class RunsConsumer {
  constructor(private readonly executeRun: ExecuteRun) {}

  @Subscribe(ExecuteRunCommand)
  onExecute(data: ExecuteRunPayload): Promise<void> {
    return this.executeRun.execute(data);
  }
}
