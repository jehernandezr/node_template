import { Injectable } from '@nestjs/common';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { RegisterUserInput } from '../domain/register-user-input.js';
import type { UserSnapshot } from '../domain/user-snapshot.js';
import { SetLastTenant } from './set-last-tenant.use-case.js';
import { UserDirectory } from '../domain/user-directory.js';
import { UserReader } from './user-reader.js';
import { UserRegistrar } from './user-registrar.js';
import { UsersFacade } from './users.facade.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentityErrorCode } from '@contracts/identity';

/** Lets sign-in, registration and tenant moves find, register and relocate users, and remember their last tenant. */
@Injectable()
export class LocalUsersFacade extends UsersFacade {
  constructor(
    private readonly reader: UserReader,
    private readonly registrar: UserRegistrar,
    private readonly lastTenant: SetLastTenant,
    private readonly directory: UserDirectory,
  ) {
    super();
  }

  override findByEmail(email: string): Promise<UserSnapshot | undefined> {
    return this.reader.findByEmail(email);
  }

  override getByRef(ref: UserRef): Promise<UserSnapshot> {
    return this.reader.getByRef(ref);
  }

  override refOf(userId: string): Promise<UserRef | undefined> {
    return this.reader.refOf(userId);
  }

  /**
   * @throws IdentityError `IDENTITY.INVITATION.INVALID` if the email already has an account: whoever registers outside the
   * public route (an invitation or the initial load) cannot create another account with that email.
   */
  override async register(input: RegisterUserInput): Promise<UserRef> {
    const ref = await this.registrar.register(input);
    if (ref === undefined) {
      throw new IdentityError(IdentityErrorCode.InvitationInvalid);
    }
    return ref;
  }

  override setLastTenant(ref: UserRef, tenantId: string): Promise<void> {
    return this.lastTenant.execute(ref, tenantId);
  }

  override relocateHomeTenant(
    homeTenantId: string,
    region: string,
  ): Promise<void> {
    return this.directory.relocateHomeTenant(homeTenantId, region);
  }
}
