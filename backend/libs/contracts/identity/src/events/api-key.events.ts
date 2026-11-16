import { defineEvent } from '@contracts/platform';
import { IdentityEvent } from '../enums/identifiers.enum.js';
import {
  ApiKeyCreatedPayloadSchema,
  ApiKeyRevokedPayloadSchema,
} from '../schemas/event.schema.js';

export const ApiKeyCreatedEvent = defineEvent({
  type: IdentityEvent.ApiKeyCreated,
  payload: ApiKeyCreatedPayloadSchema,
  description: 'Se creó una API key. No incluye el secreto.',
});

export const ApiKeyRevokedEvent = defineEvent({
  type: IdentityEvent.ApiKeyRevoked,
  payload: ApiKeyRevokedPayloadSchema,
  description: 'Se revocó una API key.',
});
