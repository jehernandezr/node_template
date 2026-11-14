import { defineEvent } from '@contracts/platform';
import { IdentityEvent } from '../enums/identifiers.enum.js';
import {
  SessionRevokedPayloadSchema,
  TokensRevokedPayloadSchema,
} from '../schemas/session.schema.js';

export const SessionRevokedEvent = defineEvent({
  type: IdentityEvent.SessionRevoked,
  payload: SessionRevokedPayloadSchema,
  description:
    'Se revocó una sesión. El gateway de tiempo real cierra sus conexiones.',
});

export const TokensRevokedEvent = defineEvent({
  type: IdentityEvent.TokensRevoked,
  payload: TokensRevokedPayloadSchema,
  description:
    'Se revocaron los tokens de una sesión, un usuario o un tenant. Cada servicio actualiza su caché.',
});
