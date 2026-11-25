/** Rules of the limiter used to count sign-in failures. */
export enum AttemptCounterRule {
  Origin = 'identity.sign-in.origin',
  Account = 'identity.sign-in.account',
  Ip = 'identity.sign-in.ip',
}
