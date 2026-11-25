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
    'A session was revoked. The realtime gateway closes its connections.',
});

export const TokensRevokedEvent = defineEvent({
  type: IdentityEvent.TokensRevoked,
  payload: TokensRevokedPayloadSchema,
  description:
    'The tokens of a session, a user or a tenant were revoked. Each service updates its cache.',
});
