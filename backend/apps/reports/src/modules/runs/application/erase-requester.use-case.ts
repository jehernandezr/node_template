import { Injectable } from '@nestjs/common';
import type { UserRef } from '@contracts/platform';
import { ReportsDefaults } from '../../../shared/constants/reports-defaults.constants.js';
import { ReportRunMaintenance } from '../domain/report-run-maintenance.js';

/**
 * Borra a un usuario de las ejecuciones que pidió, en todos los shards: las ejecuciones son del tenant y se
 * conservan con un solicitante anónimo. Repetirlo no cambia nada.
 */
@Injectable()
export class EraseRequester {
  constructor(private readonly maintenance: ReportRunMaintenance) {}

  execute(user: UserRef): Promise<number> {
    return this.maintenance.replaceRequester(
      user.userId,
      ReportsDefaults.erasedRequester,
    );
  }
}
