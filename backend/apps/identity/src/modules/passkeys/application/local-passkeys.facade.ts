import { Injectable } from '@nestjs/common';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { PasskeyCeremony } from './passkey-ceremony.js';
import { PasskeysFacade } from './passkeys.facade.js';

/** `PasskeysFacade` dentro del proceso. */
@Injectable()
export class LocalPasskeysFacade extends PasskeysFacade {
  constructor(private readonly ceremony: PasskeyCeremony) {
    super();
  }

  async hasPasskeys(user: UserRef): Promise<boolean> {
    return (await this.ceremony.userPasskeys(user)).length > 0;
  }
}
