/**
 * Ambiente desplegado, el mismo que recibe Terraform (`var.environment`).
 * `NODE_ENV` vale `production` en dev, staging y prod, así que no sirve para
 * separar trazas, métricas ni logs por ambiente.
 */
export enum DeployEnvironment {
  Local = 'local',
  Dev = 'dev',
  Staging = 'staging',
  Prod = 'prod',
}
