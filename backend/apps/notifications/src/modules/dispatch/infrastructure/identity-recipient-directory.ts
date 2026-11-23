import { Injectable } from '@nestjs/common';
import {
  GetUserProfileOperation,
  IdentityErrorCode,
} from '@contracts/identity';
import { InternalClient } from '@platform/internal-api';
import { IdGenerator } from '@platform/kernel';
import { CallOutcomeKind } from '@platform/primitives';
import { IdentityUnavailableError } from '../../../shared/errors/identity-unavailable.error.js';
import type { Recipient } from '../domain/recipient.js';
import { RecipientDirectory } from '../domain/recipient-directory.js';

/** Datos de contacto por la operación `identity.users.get-profile.v1`. */
@Injectable()
export class IdentityRecipientDirectory extends RecipientDirectory {
  constructor(
    private readonly client: InternalClient,
    private readonly ids: IdGenerator,
  ) {
    super();
  }

  /** @throws IdentityUnavailableError si identity no responde. */
  async find(userId: string): Promise<Recipient | undefined> {
    const outcome = await this.client.call(
      GetUserProfileOperation,
      { userId },
      { idempotencyKey: this.ids.next().toString() },
    );
    if (
      outcome.kind === CallOutcomeKind.BusinessError &&
      outcome.code === IdentityErrorCode.UserNotFound
    ) {
      return undefined;
    }
    if (outcome.kind !== CallOutcomeKind.Success) {
      throw new IdentityUnavailableError(
        GetUserProfileOperation.id,
        outcome.kind,
      );
    }
    const profile = outcome.value;
    return {
      ref: { userId: profile.id, homeTenantId: profile.homeTenantId },
      email: profile.email,
      locale: profile.locale,
      displayName: profile.displayName,
    };
  }
}
