/** Recurso de cada controller de identity, el nombre que recibe `@Resource`. */
export enum IdentityResource {
  Users = 'users',
  Passwords = 'passwords',
  Authentication = 'authentication',
  Devices = 'devices',
  Mfa = 'mfa',
  Passkeys = 'passkeys',
  Sessions = 'sessions',
  Tokens = 'tokens',
  Tenants = 'tenants',
  Access = 'access',
  Invitations = 'invitations',
  ApiKeys = 'api-keys',
  Sagas = 'sagas',
}
