import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { TfvarsBlockReader } from './tfvars-block-reader.mjs';

const RUNTIME = Object.freeze({
  fargate: 'fargate',
  lambda: 'lambda',
  none: 'none',
});

// Discovers the services of an environment by walking environments/<environment>/services/*.
// A service is a folder with terraform.tfvars and backend.tfvars; there is no list of names.
export class ServiceCatalog {
  #terraformRoot;

  constructor(terraformRoot) {
    this.#terraformRoot = terraformRoot;
  }

  discover(environment) {
    const environmentDir = join(
      this.#terraformRoot,
      'environments',
      environment,
    );
    if (!existsSync(environmentDir)) {
      throw new Error(`No existe el ambiente ${environment}`);
    }
    const servicesDir = join(environmentDir, 'services');
    if (!existsSync(servicesDir)) return [];

    return readdirSync(servicesDir)
      .filter((name) => statSync(join(servicesDir, name)).isDirectory())
      .filter((name) => hasServiceFiles(join(servicesDir, name)))
      .sort()
      .map((name) => describeService(name, join(servicesDir, name)));
  }

  find(environment, service) {
    const found = this.discover(environment).find(
      (entry) => entry.name === service,
    );
    if (found === undefined) {
      throw new Error(`El servicio ${service} no está en ${environment}`);
    }
    return found;
  }
}

function hasServiceFiles(serviceDir) {
  return (
    existsSync(join(serviceDir, 'terraform.tfvars')) &&
    existsSync(join(serviceDir, 'backend.tfvars'))
  );
}

function describeService(name, serviceDir) {
  const reader = new TfvarsBlockReader(
    readFileSync(join(serviceDir, 'terraform.tfvars'), 'utf8'),
  );
  const declaredName = reader.topLevelString('service_name');
  if (declaredName !== undefined && declaredName !== name) {
    throw new Error(
      `service_name ${declaredName} no coincide con la carpeta ${name}`,
    );
  }

  const runtime = reader.hasBlock('api')
    ? (reader.stringIn('api', 'runtime') ?? RUNTIME.none)
    : RUNTIME.none;
  const hasWorkers = reader.hasContent('workers');
  const hasConsumers = reader.hasContent('consumers');
  const hasRealtime = reader.hasContent('realtime');

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
