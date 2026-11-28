import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';
import { ServiceName } from './service-name.mjs';

const ENVIRONMENT = 'dev';
const PRIORITY_STEP = 10;
const SKIPPED = Object.freeze(['.terraform', '.environment-generated']);
const TREE = Object.freeze(['backend', 'infra', 'terraform']);
const REPOSITORY_FILES = Object.freeze(['.nvmrc']);
const COPIES = 'tmp';

/**
 * A throwaway copy of the Terraform tree where a service, with the values the service generator renders for it, sits next to the real values of the dev environment and is registered the way the generator's shared lines ask: a listener priority above every other one, and its databases and Valkey user in the data stack. tf-validate plans its two service stacks there, so a generated service that would not plan fails the validation. The copy lives in the repository's gitignored tmp/ folder, not in the system temporary folder, because terraform init fills it with providers.
 */
export class GeneratedServiceWorkspace {
  #terraformRoot;
  #valuesDir;
  #service;
  #copyRoot;
  #root;

  /**
   * @param {string} terraformRoot Root of the Terraform tree (backend/infra/terraform).
   * @param {string} valuesDir Folder with the generated terraform.tfvars and backend.tfvars, and base/ with those of service-base.
   */
  constructor(terraformRoot, valuesDir) {
    this.#terraformRoot = terraformRoot;
    this.#valuesDir = valuesDir;
    this.#service = new ServiceName(basename(valuesDir));
  }

  /**
   * The environment the copy places the service in.
   * @returns {string} dev, the only environment the generator writes values for.
   */
  get environment() {
    return ENVIRONMENT;
  }

  /**
   * The service folder under environments/dev/services.
   * @returns {string} The kebab-case name of the service.
   */
  get service() {
    return this.#service.folder;
  }

  /**
   * The folder that holds the copies: tmp/ at the root of the repository.
   * @returns {string} Absolute path of the folder.
   */
  get copiesDir() {
    return join(this.#repository, COPIES);
  }

  /**
   * Builds the copy under the repository's tmp/ folder, at the same depth as in the repository and with the repository files the modules read (.nvmrc).
   * @returns {string} Root of the copied Terraform tree.
   */
  create() {
    mkdirSync(this.copiesDir, { recursive: true });
    this.#copyRoot = mkdtempSync(join(this.copiesDir, 'generated-service-'));
    this.#root = join(this.#copyRoot, ...TREE);
    const repository = this.#repository;
    for (const file of REPOSITORY_FILES) {
      cpSync(join(repository, file), join(this.#copyRoot, file));
    }
    const copy = (path) =>
      cpSync(join(this.#terraformRoot, path), join(this.#root, path), {
        recursive: true,
        filter: (source) => !SKIPPED.includes(basename(source)),
      });
    for (const path of [
      'stacks/service-base',
      'stacks/service',
      'modules',
      'topology.json',
    ]) {
      copy(path);
    }
    const environment = join('environments', ENVIRONMENT);
    for (const path of ['common.tfvars', 'network', 'platform', 'messaging']) {
      copy(join(environment, path));
    }
    cpSync(
      this.#valuesDir,
      join(this.#root, environment, 'services', this.#service.folder),
      { recursive: true },
    );
    this.#registerListenerPriority();
    this.#registerData(join(this.#root, environment, 'data'));
    return this.#root;
  }

  /**
   * Deletes the copy, if it exists.
   */
  remove() {
    if (this.#copyRoot !== undefined) {
      rmSync(this.#copyRoot, { recursive: true, force: true });
      this.#copyRoot = undefined;
      this.#root = undefined;
    }
  }

  get #repository() {
    return join(this.#terraformRoot, ...TREE.map(() => '..'));
  }

  #registerListenerPriority() {
    const file = 'listener-priorities.json';
    const priorities = JSON.parse(
      readFileSync(join(this.#terraformRoot, file), 'utf8'),
    );
    const highest = Math.max(0, ...Object.values(priorities));
    priorities[this.#service.terraform] = highest + PRIORITY_STEP;
    writeFileSync(join(this.#root, file), JSON.stringify(priorities));
  }

  #registerData(dataDir) {
    const name = this.#service.terraform;
    cpSync(
      join(this.#terraformRoot, 'environments', ENVIRONMENT, 'data'),
      dataDir,
      { recursive: true },
    );
    writeFileSync(
      join(dataDir, 'terraform.tfvars'),
      [
        `db_services = {\n  ${name} = { shards = 2 }\n}`,
        `valkey_services = ["${name}"]`,
        '',
      ].join('\n'),
    );
  }
}
