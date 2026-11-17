import type { UserProfile } from '@contracts/identity';
import type { UserSnapshot } from '../domain/user-snapshot.js';

/** El perfil que responde el contrato a partir de la vista del usuario. */
export class UserProfileView {
  static of(user: UserSnapshot): UserProfile {
    return {
      id: user.id,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      displayName: user.displayName,
      locale: user.locale,
      status: user.status,
      homeTenantId: user.homeTenantId,
      lastTenantId: user.lastTenantId ?? null,
    };
  }
}
