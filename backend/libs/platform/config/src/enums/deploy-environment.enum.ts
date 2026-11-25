/**
 * Deployed environment, the same one Terraform receives (`var.environment`).
 * `NODE_ENV` is `production` in dev, staging and prod, so it cannot be used to
 * separate traces, metrics or logs by environment.
 */
export enum DeployEnvironment {
  Local = 'local',
  Dev = 'dev',
  Staging = 'staging',
  Prod = 'prod',
}
