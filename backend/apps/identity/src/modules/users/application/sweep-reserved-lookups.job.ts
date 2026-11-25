import { Injectable } from '@nestjs/common';
import {
  Clock,
  JobScheduleKind,
  ScheduledJob,
  type JobSchedule,
} from '@platform/kernel';
import { IdentityDefaults } from '../../../shared/constants/identity-defaults.constants.js';
import { IdentityJob } from '../../../shared/enums/identity-job.enum.js';
import { UserDirectory } from '../domain/user-directory.js';

/** Deletes the `identity_lookup` reservations left without a user: registration failed between the catalog and the shard. */
@Injectable()
export class SweepReservedLookupsJob extends ScheduledJob {
  private static readonly EVERY_MS = 15 * 60_000;

  readonly name = IdentityJob.SweepReservedLookups;
  readonly schedule: JobSchedule = {
    kind: JobScheduleKind.Interval,
    everyMs: SweepReservedLookupsJob.EVERY_MS,
  };
  override readonly exclusive = true;

  constructor(
    private readonly directory: UserDirectory,
    private readonly clock: Clock,
  ) {
    super();
  }

  async run(): Promise<void> {
    await this.directory.sweepReserved(
      new Date(
        this.clock.now().getTime() - IdentityDefaults.reservedLookupMaxAgeMs,
      ),
    );
  }
}
