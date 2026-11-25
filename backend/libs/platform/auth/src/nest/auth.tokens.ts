/** Options `AuthModule` was composed with. */
export const AUTH_OPTIONS = Symbol('AUTH_OPTIONS');

/** The Valkey `AuthStateReader` that `CachedAuthStateReader` wraps; it is a different object from the one exported as `AuthStateReader`. */
export const AUTH_STATE_SOURCE = Symbol('AUTH_STATE_SOURCE');
