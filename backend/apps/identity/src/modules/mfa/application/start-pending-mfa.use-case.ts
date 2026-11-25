import { Injectable } from '@nestjs/common';
import type { PendingMfa } from '@contracts/identity';
import { Clock, IdGenerator } from '@platform/kernel';
import { IdentityDefaults } from '../../../shared/constants/identity-defaults.constants.js';
import { PendingPurpose } from '../../../shared/enums/pending-purpose.enum.js';
import { PendingAuthenticationStore } from '../domain/pending-authentication-store.js';
import type { StartPendingInput } from '../domain/start-pending-input.js';
import { MfaMethodCatalog } from './mfa-method-catalog.js';

/**
 * Stores the pending authentication with the factors the user can use and returns its `mfaToken`. In a
 * sign-in the factor of the first step is not offered again: one factor never counts twice.
 */
@Injectable()
export class StartPendingMfa {
  constructor(
    private readonly pending: PendingAuthenticationStore,
    private readonly methods: MfaMethodCatalog,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  /**
   * Opens a pending authentication.
   * @param input User, purpose, client and methods already satisfied.
   * @returns The `mfaToken` and the offered methods.
   */
  async execute(input: StartPendingInput): Promise<PendingMfa> {
    const offered = await this.methods.offered(
      input.user,
      input.purpose === PendingPurpose.SignIn ? input.authMethods : [],
    );
    const mfaToken = await this.pending.save({
      id: this.ids.next().toString(),
      user: input.user,
      purpose: input.purpose,
      ...(input.deviceId === undefined ? {} : { deviceId: input.deviceId }),
      offeredFactors: offered,
      ...(input.sessionId === undefined ? {} : { sessionId: input.sessionId }),
      client: input.client,
      authMethods: input.authMethods,
      expiresAt: new Date(
        this.clock.now().getTime() +
          IdentityDefaults.pendingAuthenticationTtlMs,
      ),
    });
    return { mfaToken, methods: offered };
  }
}
