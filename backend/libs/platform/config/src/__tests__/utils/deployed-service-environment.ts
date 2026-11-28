import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ConfigEnv } from '../../config-env.js';
import { DeployEnvironment } from '../../enums/deploy-environment.enum.js';

/**
 * The environment Terraform gives a service in a deployed environment: the `environment_variables` and the `secrets`
 * of its `service-base` values, plus `DEPLOY_ENVIRONMENT`, `SERVICE_NAME` and the region keys as the stack sets them
 * from `common.tfvars`. A secret takes the sample value the test gives for it. A service config test parses the
 * result, so a provider or a variable its environment rejects fails the test before it fails a deploy.
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
  private static readonly IDENTITY = 'identity';
  private static readonly SERVICE_NAME = /^service_name\s*=\s*"([^"]+)"/m;
  private static readonly MAIN_REGION = /^main_region\s*=\s*"([^"]+)"/m;
  private static readonly REGIONS = /^regions\s*=\s*\{\n([\s\S]*?)^\}/m;
  private static readonly REGION =
    /^\s*([a-z][a-z0-9-]*)\s*=\s*\{\s*aws_region\s*=\s*"[^"]*",\s*api_base_url\s*=\s*"([^"]*)",\s*issuer\s*=\s*"([^"]*)"\s*\}\s*$/;
  private static readonly VARIABLES =
    /^environment_variables\s*=\s*\{\n([\s\S]*?)^\}/m;
  private static readonly SECRETS = /^secrets\s*=\s*\{(?:\}|\n([\s\S]*?)^\})/m;
  private static readonly SECRET = /^\s*"?([A-Z][A-Z0-9_]*)"?\s*=/;
  private static readonly ASSIGNMENT =
    /^\s*([A-Z][A-Z0-9_]*)\s*=\s*("(?:[^"\\]|\\.)*")\s*$/;

  /**
   * Reads the environment of a service from its `service-base` values.
   * @param folder Folder of the service under `environments/<environment>/services`.
   * @param environment Deployed environment.
   * @param samples Valid values for the variables the service receives as secrets.
   * @returns The variables and secrets, with `DEPLOY_ENVIRONMENT`, `SERVICE_NAME` and the region keys.
   * @throws Error if the values have no `service_name`, a variable is not a quoted string, a secret has no sample or
   * `common.tfvars` has no main region.
   */
  static of(
    folder: string,
    environment: DeployEnvironment,
    samples: ConfigEnv,
  ): ConfigEnv {
    const service = DeployedServiceEnvironment.parse(
      DeployedServiceEnvironment.read(folder, environment),
      environment,
      samples,
    );
    return {
      ...service,
      ...DeployedServiceEnvironment.regions(
        DeployedServiceEnvironment.readCommon(environment),
        service['SERVICE_NAME'] ?? '',
      ),
    };
  }

  /**
   * The region keys `service-base` builds from `common.tfvars` for a service of the main region: `REGIONS`,
   * `SERVICE_REGION` and `AUTH_ISSUER`, plus `IDENTITY_REGION` and `IDENTITY_ISSUER` for identity.
   * @param common Text of an environment's `common.tfvars`.
   * @param serviceName Service name, as `service_name` gives it.
   * @returns The region keys.
   * @throws Error if `main_region` is missing or is not a key of `regions`.
   */
  static regions(common: string, serviceName: string): ConfigEnv {
    const main = DeployedServiceEnvironment.MAIN_REGION.exec(common)?.[1];
    const block = DeployedServiceEnvironment.REGIONS.exec(common)?.[1] ?? '';
    const regions = DeployedServiceEnvironment.lines(block)
      .map((line) => {
        const region = DeployedServiceEnvironment.REGION.exec(line);
        if (region === null) {
          throw new Error(`Not a region entry: ${line.trim()}`);
        }
        return {
          code: region[1] ?? '',
          apiBaseUrl: region[2] ?? '',
          issuer: region[3] ?? '',
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code));
    const served = regions.find((region) => region.code === main);
    if (served === undefined) {
      throw new Error('main_region is not a key of regions');
    }
    return {
      REGIONS: JSON.stringify(regions),
      SERVICE_REGION: served.code,
      AUTH_ISSUER: served.issuer,
      ...(serviceName === DeployedServiceEnvironment.IDENTITY
        ? { IDENTITY_REGION: served.code, IDENTITY_ISSUER: served.issuer }
        : {}),
    };
  }

  /**
   * Builds the environment from the text of `service-base` values.
   * @param values Text of a `service-base` terraform.tfvars.
   * @param environment Deployed environment.
   * @param samples Valid values for the variables the values deliver as secrets.
   * @returns The variables and secrets, with `DEPLOY_ENVIRONMENT` and `SERVICE_NAME`.
   * @throws Error if the values have no `service_name`, a variable is not a quoted string or a secret has no sample.
   */
  static parse(
    values: string,
    environment: DeployEnvironment,
    samples: ConfigEnv,
  ): ConfigEnv {
    const serviceName =
      DeployedServiceEnvironment.SERVICE_NAME.exec(values)?.[1];
    if (serviceName === undefined) {
      throw new Error(`The ${environment} values have no service_name`);
    }
    return {
      ...DeployedServiceEnvironment.variables(values),
      ...DeployedServiceEnvironment.secrets(values, samples),
      DEPLOY_ENVIRONMENT: environment,
      SERVICE_NAME: serviceName,
    };
  }

  private static read(folder: string, environment: DeployEnvironment): string {
    return readFileSync(
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
  }

  private static readCommon(environment: DeployEnvironment): string {
    return readFileSync(
      join(
        DeployedServiceEnvironment.TERRAFORM_ROOT,
        'environments',
        environment,
        'common.tfvars',
      ),
      'utf8',
    );
  }

  private static secrets(values: string, samples: ConfigEnv): ConfigEnv {
    const block = DeployedServiceEnvironment.SECRETS.exec(values)?.[1] ?? '';
    return Object.fromEntries(
      DeployedServiceEnvironment.lines(block).map((line) => {
        const name = DeployedServiceEnvironment.SECRET.exec(line)?.[1];
        if (name === undefined) {
          throw new Error(`Not a secret variable: ${line.trim()}`);
        }
        const sample = samples[name];
        if (sample === undefined) {
          throw new Error(`The secret ${name} has no sample value`);
        }
        return [name, sample];
      }),
    );
  }

  private static lines(block: string): string[] {
    return block
      .split('\n')
      .filter((line) => line.trim() !== '' && !line.trim().startsWith('#'));
  }

  private static variables(values: string): ConfigEnv {
    const block = DeployedServiceEnvironment.VARIABLES.exec(values)?.[1] ?? '';
    return Object.fromEntries(
      DeployedServiceEnvironment.lines(block).map((line) => {
        const assignment = DeployedServiceEnvironment.ASSIGNMENT.exec(line);
        if (assignment === null) {
          throw new Error(`Not a quoted environment variable: ${line.trim()}`);
        }
        return [assignment[1], JSON.parse(assignment[2] ?? '""') as string];
      }),
    );
  }
}
