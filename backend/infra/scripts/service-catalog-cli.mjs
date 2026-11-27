import { fileURLToPath } from 'node:url';
import { ServiceCatalog } from './service-catalog.mjs';

/**
 * Usage text of the catalog CLI. The Terraform root is TF_ROOT or, by default, backend/infra/terraform.
 */
const USAGE = [
  'Usage:',
  '  service-catalog-cli.mjs matrix <environment>',
  '  service-catalog-cli.mjs list <environment>',
  '  service-catalog-cli.mjs entry <environment> <service>',
].join('\n');

const COMMANDS = Object.freeze({
  matrix: 'matrix',
  list: 'list',
  entry: 'entry',
});

/**
 * Command line of the service catalog for the pipeline scripts: prints the GitHub Actions matrix, the service names or the entry of one service.
 */
export class ServiceCatalogCli {
  static #defaultTerraformRoot = fileURLToPath(
    new URL('../terraform', import.meta.url),
  );

  /**
   * Runs one catalog command.
   * @param {string[]} argv Command, environment and, for entry, the service.
   * @param {Record<string, string | undefined>} env Process environment; TF_ROOT overrides the Terraform root.
   * @param {import('node:stream').Writable} out Stream that receives the result.
   * @param {import('node:stream').Writable} [err] Stream that receives the usage or the error.
   * @returns {number} 0 on success, 1 on a usage error or a catalog error.
   */
  static main(argv, env, out, err = process.stderr) {
    const [command, environment, service] = argv;
    if (!ServiceCatalogCli.#isValid(command, environment, service)) {
      err.write(`${USAGE}\n`);
      return 1;
    }
    try {
      const catalog = new ServiceCatalog(
        env.TF_ROOT || ServiceCatalogCli.#defaultTerraformRoot,
      );
      ServiceCatalogCli.#execute(command, environment, service, catalog, out);
      return 0;
    } catch (error) {
      err.write(`${error.message}\n`);
      return 1;
    }
  }

  static #isValid(command, environment, service) {
    if (!Object.hasOwn(COMMANDS, command) || !environment) return false;
    return command !== COMMANDS.entry || Boolean(service);
  }

  static #execute(command, environment, service, catalog, out) {
    if (command === COMMANDS.matrix) {
      out.write(
        `${JSON.stringify({ include: catalog.discover(environment) })}\n`,
      );
      return;
    }
    if (command === COMMANDS.list) {
      for (const entry of catalog.discover(environment))
        out.write(`${entry.name}\n`);
      return;
    }
    out.write(`${JSON.stringify(catalog.find(environment, service))}\n`);
  }
}

process.exitCode = ServiceCatalogCli.main(
  process.argv.slice(2),
  process.env,
  process.stdout,
);
