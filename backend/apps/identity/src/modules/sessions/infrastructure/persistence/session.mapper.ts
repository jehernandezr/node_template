import type {
  AuthMethodReference,
  ClientPlatform,
  RevocationReason,
} from '@contracts/identity';
import { Session } from '../../domain/session.js';
import { SessionEntity } from './entities/session.entity.js';

/** Convierte entre `Session` y su fila. */
export class SessionMapper {
  toDomain(row: SessionEntity): Session {
    return Session.rehydrate({
      id: row.id,
      userId: row.userId,
      homeTenantId: row.homeTenantId,
      activeTenantId: row.activeTenantId,
      ...(row.deviceId === null ? {} : { deviceId: row.deviceId }),
      deviceName: row.deviceName,
      platform: row.platform as ClientPlatform,
      tokenSalt: row.tokenSalt,
      generation: row.generation,
      ...(row.previousGenerationUntil === null
        ? {}
        : { previousGenerationUntil: row.previousGenerationUntil }),
      amr: row.amr as AuthMethodReference[],
      authTime: row.authTime,
      ...(row.mfaVerifiedAt === null
        ? {}
        : { mfaVerifiedAt: row.mfaVerifiedAt }),
      idleExpiresAt: row.idleExpiresAt,
      absoluteExpiresAt: row.absoluteExpiresAt,
      lastRefreshAt: row.lastRefreshAt,
      ip: row.ip,
      ...(row.userAgent === null ? {} : { userAgent: row.userAgent }),
      ...(row.revokedAt === null ? {} : { revokedAt: row.revokedAt }),
      ...(row.revocationReason === null
        ? {}
        : { revocationReason: row.revocationReason as RevocationReason }),
      version: row.version,
    });
  }

  toPersistence(session: Session): SessionEntity {
    const state = session.snapshot();
    const row = new SessionEntity();
    row.id = state.id;
    row.userId = state.userId;
    row.homeTenantId = state.homeTenantId;
    row.activeTenantId = state.activeTenantId;
    row.deviceId = state.deviceId ?? null;
    row.deviceName = state.deviceName;
    row.platform = state.platform;
    row.tokenSalt = state.tokenSalt;
    row.generation = state.generation;
    row.previousGenerationUntil = state.previousGenerationUntil ?? null;
    row.amr = [...state.amr];
    row.authTime = state.authTime;
    row.mfaVerifiedAt = state.mfaVerifiedAt ?? null;
    row.idleExpiresAt = state.idleExpiresAt;
    row.absoluteExpiresAt = state.absoluteExpiresAt;
    row.lastRefreshAt = state.lastRefreshAt;
    row.ip = state.ip;
    row.userAgent = state.userAgent ?? null;
    row.revokedAt = state.revokedAt ?? null;
    row.revocationReason = state.revocationReason ?? null;
    if (state.version !== undefined) {
      row.version = state.version;
    }
    return row;
  }
}
