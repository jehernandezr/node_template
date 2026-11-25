import { defineEvent } from '@contracts/platform';
import { IdentityEvent } from '../enums/identifiers.enum.js';
import {
  ApiKeyCreatedPayloadSchema,
  ApiKeyRevokedPayloadSchema,
} from '../schemas/event.schema.js';

export const ApiKeyCreatedEvent = defineEvent({
  type: IdentityEvent.ApiKeyCreated,
  payload: ApiKeyCreatedPayloadSchema,
  description: 'An API key was created. It does not include the secret.',
});

export const ApiKeyRevokedEvent = defineEvent({
  type: IdentityEvent.ApiKeyRevoked,
  payload: ApiKeyRevokedPayloadSchema,
  description: 'An API key was revoked.',
});
