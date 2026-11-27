import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ConfigEnv } from '../../config-env.js';
import { DeployEnvironment } from '../../enums/deploy-environment.enum.js';

/**
 * The non-secret environment Terraform gives a service in a deployed environment: the `environment_variables` of its
 * `service-base` values, plus `DEPLOY_ENVIRONMENT` and `SERVICE_NAME` as the stack sets them. A service config test
 * parses it, so a provider its environment rejects fails the test before it fails a deploy.
 */
export class DeployedServiceEnvironment {
  /** The environments with service values in Terraform. */
  static readonly ENVIRONMENTS: readonly DeployEnvironment[] = [
    DeployEnvironment.Dev,
    DeployEnvironment.Staging,
    DeployEnvironment.Prod,
  ];

  private static readonly TERRAFORM_ROOT = join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    '..',
    '..',
    'infra',
    'terraform',
  );
  private static readonly SERVICE_NAME = /^service_name\s*=\s*"([^"]+)"/m;
  private static readonly VARIABLES =
    /^environment_variables\s*=\s*\{\n([\s\S]*?)^\}/m;
  private static readonly ASSIGNMENT =
    /^\s*([A-Z][A-Z0-9_]*)\s*=\s*("(?:[^"\\]|\\.)*")\s*$/;

  /**
   * Reads the environment of a service from its `service-base` values.
   * @param folder Folder of the service under `environments/<environment>/services`.
   * @param environment Deployed environment.
   * @returns The variables, with `DEPLOY_ENVIRONMENT` and `SERVICE_NAME`.
   * @throws Error if the values have no `service_name` or a variable is not a quoted string.
   */
  static of(folder: string, environment: DeployEnvironment): ConfigEnv {
    const values = readFileSync(
      join(
        DeployedServiceEnvironment.TERRAFORM_ROOT,
        'environments',
        environment,
        'services',
        folder,
        'base',
        'terraform.tfvars',
      ),
      'utf8',
    );
    const serviceName =
      DeployedServiceEnvironment.SERVICE_NAME.exec(values)?.[1];
    if (serviceName === undefined) {
      throw new Error(
        `The ${environment} values of ${folder} have no service_name`,
      );
    }
    return {
      ...DeployedServiceEnvironment.variables(values),
      DEPLOY_ENVIRONMENT: environment,
      SERVICE_NAME: serviceName,
    };
  }

  private static variables(values: string): ConfigEnv {
    const block = DeployedServiceEnvironment.VARIABLES.exec(values)?.[1] ?? '';
    return Object.fromEntries(
      block
        .split('\n')
        .filter((line) => line.trim() !== '' && !line.trim().startsWith('#'))
        .map((line) => {
          const assignment = DeployedServiceEnvironment.ASSIGNMENT.exec(line);
          if (assignment === null) {
            throw new Error(
              `Not a quoted environment variable: ${line.trim()}`,
            );
          }
          return [assignment[1], JSON.parse(assignment[2] ?? '""') as string];
        }),
    );
  }
}
