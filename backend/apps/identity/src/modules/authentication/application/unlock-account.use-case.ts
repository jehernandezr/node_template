import { Injectable } from '@nestjs/common';
import type { UseCase } from '@platform/kernel';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { UsersFacade } from '../../users/index.js';
import { LockoutKeys } from './lockout-keys.js';
import { LoginLockout } from './login-lockout.js';

/**
 * Desbloquea una cuenta: quita el bloqueo de todos sus orígenes, el modo protegido y sus fallos contados.
 * Lo usa soporte o un flujo de recuperación ya verificado; el bloqueo de una IP no cambia, porque no es de
 * la cuenta. Repetirlo es inocuo.
 */
@Injectable()
export class UnlockAccount implements UseCase<UserRef, void> {
  constructor(
    private readonly users: UsersFacade,
    private readonly lockout: LoginLockout,
    private readonly keys: LockoutKeys,
  ) {}

  async execute(ref: UserRef): Promise<void> {
    const user = await this.users.getByRef(ref);
    await this.lockout.unlock(this.keys.account(user.email));
  }
}
