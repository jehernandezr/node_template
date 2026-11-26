import { Injectable } from '@nestjs/common';
import { RevocationReason } from '@contracts/identity';
import { Clock, IdGenerator } from '@platform/kernel';
import { IdentitySettings } from '../config/identity-settings.js';
import type { UserRef } from '../shared/types/user-ref.type.js';
import { DevicesFacade } from '../modules/devices/index.js';
import { MfaFacade } from '../modules/mfa/index.js';
import { PasswordsFacade } from '../modules/passwords/index.js';
import { SessionsFacade } from '../modules/sessions/index.js';
import { UsersFacade } from '../modules/users/index.js';
import { SmokeAccount } from './smoke-account.js';
import { SmokeTenants } from './smoke-tenants.js';

/**
 * Seeds the smoke account when `IDENTITY_SMOKE_ACCOUNT` is set: the smoke tenant and its owner, whose email is the
 * account's. Every run resets the owner to the account's password and TOTP secret and removes its devices and
 * sessions, so the smoke tests always sign in from a new device. It is idempotent: it runs on every deployment.
 */
@Injectable()
export class SeedSmokeAccount {
  private static readonly DISPLAY_NAME = 'Smoke tests';
  private static readonly LOCALE = 'en';

  constructor(
    private readonly users: UsersFacade,
    private readonly passwords: PasswordsFacade,
    private readonly mfa: MfaFacade,
    private readonly devices: DevicesFacade,
    private readonly sessions: SessionsFacade,
    private readonly tenants: SmokeTenants,
    private readonly settings: IdentitySettings,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  /**
   * Creates or resets the smoke account; does nothing when `IDENTITY_SMOKE_ACCOUNT` is not set.
   * @returns Whether the account was seeded.
   */
  async execute(): Promise<boolean> {
    const configured = this.settings.values.IDENTITY_SMOKE_ACCOUNT;
    if (configured === undefined) {
      return false;
    }
    const account = SmokeAccount.parse(configured.reveal());
    await this.passwords.assertAcceptable(account.password, account.email);
    const owner = await this.ownerOf(account);
    await this.tenants.seed(owner.homeTenantId, owner.userId);
    await this.passwords.setInitial(owner, account.password);
    await this.mfa.replaceTotp(owner, account.totpSecret);
    await this.sessions.revokeUserSessions(owner, RevocationReason.AdminAction);
    await this.devices.forget(owner);
    return true;
  }

  private async ownerOf(account: SmokeAccount): Promise<UserRef> {
    const existing = await this.users.findByEmail(account.email);
    if (existing !== undefined) {
      return { userId: existing.id, homeTenantId: existing.homeTenantId };
    }
    const tenantId = this.ids.next().toString();
    await this.tenants.place(tenantId);
    return this.users.register({
      email: account.email,
      password: account.password,
      displayName: SeedSmokeAccount.DISPLAY_NAME,
      locale: SeedSmokeAccount.LOCALE,
      homeTenantId: tenantId,
      emailVerifiedAt: this.clock.now(),
    });
  }
}
