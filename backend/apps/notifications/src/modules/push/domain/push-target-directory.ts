import type { PushTarget } from '@contracts/identity';
import type { UserRef } from '@contracts/platform';

/** A user's devices that accept push, according to identity. */
export abstract class PushTargetDirectory {
  abstract targetsOf(user: UserRef): Promise<readonly PushTarget[]>;
}
