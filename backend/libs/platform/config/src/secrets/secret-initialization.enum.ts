/** What `SecretInitializer.initialize` did with a secret. */
export enum SecretInitialization {
  /** The secret had no value and now holds the one given. */
  Written = 'written',
  /** The secret already had a value, which stays as it was. */
  AlreadySet = 'already-set',
}
