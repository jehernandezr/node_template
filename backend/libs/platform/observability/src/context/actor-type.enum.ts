/** Who runs the operation. Used by auditing (`app.actor_id`) and logs. */
export enum ActorType {
  User = 'user',
  ServiceAccount = 'service_account',
  ApiKey = 'api_key',
  System = 'system',
}
