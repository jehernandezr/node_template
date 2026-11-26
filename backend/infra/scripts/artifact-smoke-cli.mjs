import { fileURLToPath } from 'node:url';
import {
  ArtifactSmoke,
  CommandRunner,
  ServiceArtifacts,
  Sleeper,
} from './artifact-smoke.mjs';

const USAGE =
  'Usage: artifact-smoke-cli.mjs [--services=<a,b>] [--prefix=<name>]\nBuild the bundles first: pnpm nx run-many -t build --projects=<services>.';

/** Command line of the artifact smoke: every service by default, or the ones `--services` lists. */
export class ArtifactSmokeCli {
  static DEFAULT_PREFIX = 'artifact-smoke';
  static ROOT = fileURLToPath(new URL('../../..', import.meta.url));

  /**
   * Parses the arguments and runs the smoke.
   * @param {string[]} argv Arguments after the script name.
   * @returns {number} The exit code.
   */
  static main(argv) {
    const option = (name) =>
      argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
    if (argv.some((arg) => !/^--(services|prefix)=.+$/.test(arg))) {
      console.error(USAGE);
      return 2;
    }
    const artifacts = new ServiceArtifacts(ArtifactSmokeCli.ROOT);
    const known = artifacts.services();
    const services = option('services')?.split(',') ?? known;
    const unknown = services.filter((service) => !known.includes(service));
    if (unknown.length > 0) {
      console.error(`Unknown services: ${unknown.join(', ')}\n${USAGE}`);
      return 2;
    }
    return new ArtifactSmoke({
      root: ArtifactSmokeCli.ROOT,
      prefix: option('prefix') ?? ArtifactSmokeCli.DEFAULT_PREFIX,
      services,
      artifacts,
      runner: new CommandRunner(),
      sleeper: new Sleeper(),
      log: (line) => console.log(line),
    }).run();
  }
}

process.exitCode = ArtifactSmokeCli.main(process.argv.slice(2));
