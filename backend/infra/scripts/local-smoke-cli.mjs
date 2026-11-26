import { fileURLToPath } from 'node:url';
import { CommandRunner, ServiceArtifacts, Sleeper } from './artifact-smoke.mjs';
import { LocalSmoke, LocalSmokeSettings } from './local-smoke.mjs';

const USAGE =
  'Usage: local-smoke-cli.mjs [--project=<name>]\nBuild the bundles first: pnpm nx run-many -t build --projects=identity,tasks,notifications,reports,billing (deploy-smoke:local does).';

/** Command line of the local smoke: `pnpm nx run deploy-smoke:local`. */
export class LocalSmokeCli {
  static DEFAULT_PROJECT = 'local-smoke';
  static ROOT = fileURLToPath(new URL('../../..', import.meta.url));

  /**
   * Parses the arguments and runs the local smoke.
   * @param {string[]} argv Arguments after the script name.
   * @returns {number} The exit code.
   */
  static main(argv) {
    if (argv.some((arg) => !/^--project=[a-z0-9][a-z0-9-]*$/.test(arg))) {
      console.error(USAGE);
      return 2;
    }
    const project =
      argv[0]?.slice('--project='.length) ?? LocalSmokeCli.DEFAULT_PROJECT;
    return new LocalSmoke({
      root: LocalSmokeCli.ROOT,
      project,
      services: new ServiceArtifacts(LocalSmokeCli.ROOT).services(),
      settings: new LocalSmokeSettings(LocalSmokeCli.ROOT),
      runner: new CommandRunner(),
      sleeper: new Sleeper(),
      log: (line) => console.log(line),
    }).run();
  }
}

process.exitCode = LocalSmokeCli.main(process.argv.slice(2));
