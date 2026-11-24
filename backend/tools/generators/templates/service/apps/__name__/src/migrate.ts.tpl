import './instrumentation.js';
import { MigrationTarget } from '@platform/service';
import { ServiceMigrator } from '@platform/service/nest';
import { __nameCamel__Service } from './__name__.service.js';

const requested = process.argv[2] ?? MigrationTarget.All;
const target = Object.values(MigrationTarget).find(
  (value) => value === requested,
);

if (target === undefined) {
  console.error(`Uso: migrate [${Object.values(MigrationTarget).join('|')}]`);
  process.exitCode = 2;
} else {
  try {
    const report = await new ServiceMigrator().run(__nameCamel__Service, target, {
      env: process.env,
    });
    console.log(JSON.stringify(report));
    process.exitCode = 0;
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
