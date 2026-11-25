import './instrumentation.js';
import { MigrationTarget } from '@platform/service';
import { ServiceMigrator } from '@platform/service/nest';
import { notificationsService } from './notifications.service.js';

const requested = process.argv[2] ?? MigrationTarget.All;
const target = Object.values(MigrationTarget).find(
  (value) => value === requested,
);

if (target === undefined) {
  console.error(`Usage: migrate [${Object.values(MigrationTarget).join('|')}]`);
  process.exitCode = 2;
} else {
  try {
    const report = await new ServiceMigrator().run(
      notificationsService,
      target,
      {
        env: process.env,
      },
    );
    console.log(JSON.stringify(report));
    process.exitCode = 0;
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
