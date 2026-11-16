// Uso: node service-catalog-cli.mjs matrix|list <ambiente>  |  entry <ambiente> <servicio>
// La raíz de Terraform es TF_ROOT o, por defecto, backend/infra/terraform.
import { fileURLToPath } from 'node:url';
import { ServiceCatalog } from './service-catalog.mjs';

const USAGE = [
  'Uso:',
  '  service-catalog-cli.mjs matrix <ambiente>',
  '  service-catalog-cli.mjs list <ambiente>',
  '  service-catalog-cli.mjs entry <ambiente> <servicio>',
].join('\n');

const COMMANDS = Object.freeze({
  matrix: 'matrix',
  list: 'list',
  entry: 'entry',
});

export class ServiceCatalogCli {
  static #defaultTerraformRoot = fileURLToPath(
    new URL('../terraform', import.meta.url),
  );

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
