import { SystemClock } from '@platform/kernel';
import { MigrationGenerator } from '../migration-generator.js';
import { MigrationSourceRenderer } from '../migration-source-renderer.js';
import { MigrationGenerateCommand } from './migration-generate-command.js';

const command = new MigrationGenerateCommand(
  new MigrationGenerator(new SystemClock(), new MigrationSourceRenderer()),
  process.env,
  (text) => process.stdout.write(`${text}\n`),
);

process.exitCode = await command.run(process.argv.slice(2));
