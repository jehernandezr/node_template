import { Injectable } from '@nestjs/common';
import type { UserRef } from '@contracts/platform';
import { ReportsDefaults } from '../../../shared/constants/reports-defaults.constants.js';
import { ReportRunMaintenance } from '../domain/report-run-maintenance.js';

/**
 * Erases a user from the runs they requested, in all shards: runs belong to the tenant and are
 * kept with an anonymous requester. Repeating it changes nothing.
 */
@Injectable()
export class EraseRequester {
  constructor(private readonly maintenance: ReportRunMaintenance) {}

  /**
   * Replaces the user as requester of every run of the shard with an anonymous user.
   * @param user User to erase.
   * @returns How many runs changed.
   */
  execute(user: UserRef): Promise<number> {
    return this.maintenance.replaceRequester(
      user.userId,
      ReportsDefaults.erasedRequester,
    );
  }
}
