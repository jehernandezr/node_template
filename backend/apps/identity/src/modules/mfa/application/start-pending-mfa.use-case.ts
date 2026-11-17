import { Injectable } from '@nestjs/common';
import type { PendingMfa } from '@contracts/identity';
import { Clock, IdGenerator } from '@platform/kernel';
import { IdentityDefaults } from '../../../shared/constants/identity-defaults.constants.js';
import { PendingAuthenticationStore } from '../domain/pending-authentication-store.js';
import type { StartPendingInput } from '../domain/start-pending-input.js';
import { MfaMethodCatalog } from './mfa-method-catalog.js';

/** Guarda la autenticación pendiente con los factores que puede usar el usuario y devuelve su `mfaToken`. */
@Injectable()
export class StartPendingMfa {
  constructor(
    private readonly pending: PendingAuthenticationStore,
    private readonly methods: MfaMethodCatalog,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: StartPendingInput): Promise<PendingMfa> {
    const offered = await this.methods.offered(input.user);
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
