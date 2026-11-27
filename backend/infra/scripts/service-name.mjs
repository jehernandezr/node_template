/**
 * The two forms of a service name, and the only translation between them. The folder form is kebab-case: the service folder under backend/apps and under environments/<environment>/services, its Nx project, its contract, its routes, its ECR repository and the names of its AWS resources. The Terraform form is snake_case: service_name in both service stacks, its keys in db_services, valkey_services and listener-priorities.json, its databases, its database and Valkey roles and SERVICE_NAME.
 */
export class ServiceName {
  static #FOLDER = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
  static #TERRAFORM = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
  static #FOLDER_SEPARATOR = '-';
  static #TERRAFORM_SEPARATOR = '_';

  #folder;

  /**
   * @param {string} folder The kebab-case name.
   */
  constructor(folder) {
    if (!ServiceName.#FOLDER.test(folder)) {
      throw new Error(`Service name ${folder} is not kebab-case`);
    }
    this.#folder = folder;
  }

  /**
   * The service whose Terraform service_name is the given one.
   * @param {string} serviceName The snake_case name.
   * @returns {ServiceName} The service.
   * @throws {Error} If the name is not snake_case.
   */
  static fromTerraform(serviceName) {
    if (!ServiceName.#TERRAFORM.test(serviceName)) {
      throw new Error(`service_name ${serviceName} is not snake_case`);
    }
    return new ServiceName(
      serviceName.replaceAll(
        ServiceName.#TERRAFORM_SEPARATOR,
        ServiceName.#FOLDER_SEPARATOR,
      ),
    );
  }

  /**
   * The kebab-case form.
   * @returns {string} The folder, Nx project and route name.
   */
  get folder() {
    return this.#folder;
  }

  /**
   * The snake_case form.
   * @returns {string} The Terraform service_name and the data stack key.
   */
  get terraform() {
    return this.#folder.replaceAll(
      ServiceName.#FOLDER_SEPARATOR,
      ServiceName.#TERRAFORM_SEPARATOR,
    );
  }
}
