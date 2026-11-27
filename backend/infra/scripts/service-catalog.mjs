import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { TfvarsBlockReader } from './tfvars-block-reader.mjs';

const RUNTIME = Object.freeze({
  fargate: 'fargate',
  lambda: 'lambda',
  none: 'none',
});

const SERVICE_FILES = Object.freeze([
  'terraform.tfvars',
  'backend.tfvars',
  'base/terraform.tfvars',
  'base/backend.tfvars',
]);

/**
 * Discovers the services of an environment by walking environments/<environment>/services/*. Every folder there is a service and must hold every file of SERVICE_FILES (the service stack values and, in base/, the service-base values); a half-created folder is an error, not a skipped service. Its runtime and components come from base/terraform.tfvars. There is no list of names.
 */
export class ServiceCatalog {
  #terraformRoot;

  /**
   * @param {string} terraformRoot Root of the Terraform tree (backend/infra/terraform).
   */
  constructor(terraformRoot) {
    this.#terraformRoot = terraformRoot;
  }

  /**
   * Every service of an environment, sorted by folder name.
   * @param {string} environment Environment folder under environments/.
   * @returns {object[]} One entry per service: name, runtime, needsImage, needsPackage, hasWorkers, hasConsumers and hasRealtime.
   * @throws {Error} If the environment does not exist, a service folder lacks a file of SERVICE_FILES or a service_name differs from its folder.
   */
  discover(environment) {
    const environmentDir = join(
      this.#terraformRoot,
      'environments',
      environment,
    );
    if (!existsSync(environmentDir)) {
      throw new Error(`Environment ${environment} does not exist`);
    }
    const servicesDir = join(environmentDir, 'services');
    if (!existsSync(servicesDir)) return [];

    return readdirSync(servicesDir)
      .filter((name) => statSync(join(servicesDir, name)).isDirectory())
      .map((name) => requireServiceFiles(name, join(servicesDir, name)))
      .sort()
      .map((name) => describeService(name, join(servicesDir, name)));
  }

  /**
   * The entry of one service of an environment.
   * @param {string} environment Environment folder under environments/.
   * @param {string} service Service folder under services/.
   * @returns {object} The entry, as discover() describes it.
   * @throws {Error} If the service is not in the environment, or discover() fails.
   */
  find(environment, service) {
    const found = this.discover(environment).find(
      (entry) => entry.name === service,
    );
    if (found === undefined) {
      throw new Error(`Service ${service} is not in ${environment}`);
    }
    return found;
  }
}

function requireServiceFiles(name, serviceDir) {
  const missing = SERVICE_FILES.filter(
    (file) => !existsSync(join(serviceDir, file)),
  );
  if (missing.length > 0) {
    throw new Error(`Service folder ${name} is missing ${missing.join(', ')}`);
  }
  return name;
}

function describeService(name, serviceDir) {
  const declaredNames = ['terraform.tfvars', 'base/terraform.tfvars'].map(
    (file) =>
      new TfvarsBlockReader(
        readFileSync(join(serviceDir, file), 'utf8'),
      ).topLevelString('service_name'),
  );
  for (const declaredName of declaredNames) {
    if (declaredName !== undefined && declaredName !== name) {
      throw new Error(
        `service_name ${declaredName} does not match the folder ${name}`,
      );
    }
  }

  const reader = new TfvarsBlockReader(
    readFileSync(join(serviceDir, 'base', 'terraform.tfvars'), 'utf8'),
  );
  const runtime = reader.hasBlock('api')
    ? (reader.stringIn('api', 'runtime') ?? RUNTIME.none)
    : RUNTIME.none;
  const hasWorkers = reader.hasContent('workers');
  const hasConsumers = reader.hasContent('consumers');
  const hasRealtime = reader.hasBlock('realtime');

  return {
    name,
    runtime,
    needsImage: runtime === RUNTIME.fargate || hasWorkers || hasRealtime,
    needsPackage: runtime === RUNTIME.lambda || hasConsumers,
    hasWorkers,
    hasConsumers,
    hasRealtime,
  };
}
