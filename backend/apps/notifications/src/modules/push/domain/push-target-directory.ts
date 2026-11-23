import type { PushTarget } from '@contracts/identity';
import type { UserRef } from '@contracts/platform';

/** Los dispositivos de un usuario que aceptan push, según identity. */
export abstract class PushTargetDirectory {
  abstract targetsOf(user: UserRef): Promise<readonly PushTarget[]>;
}
