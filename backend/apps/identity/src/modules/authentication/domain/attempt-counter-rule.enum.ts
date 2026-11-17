/** Reglas del limitador con que se cuentan los fallos de inicio de sesión. */
export enum AttemptCounterRule {
  Origin = 'identity.sign-in.origin',
  Account = 'identity.sign-in.account',
  Ip = 'identity.sign-in.ip',
}
