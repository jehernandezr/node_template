/** Quién ejecuta la operación. Lo usan la auditoría (`app.actor_id`) y los logs. */
export enum ActorType {
  User = 'user',
  ServiceAccount = 'service_account',
  ApiKey = 'api_key',
  System = 'system',
}
