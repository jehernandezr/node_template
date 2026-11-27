/** The two forms of a service name, and the only translation between them. */
export declare class ServiceName {
  /** @param folder The kebab-case name. */
  constructor(folder: string);
  /** The service whose Terraform service_name is the given snake_case one. */
  static fromTerraform(serviceName: string): ServiceName;
  /** The kebab-case form: folder, Nx project and route name. */
  get folder(): string;
  /** The snake_case form: Terraform service_name and data stack key. */
  get terraform(): string;
}
