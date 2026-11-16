import { MessageKind, validateContract } from '@contracts/platform';
import { z } from 'zod';
import { identityContract } from '../contract.js';
import { IdentityEvent, IdentityQueue } from '../enums/identifiers.enum.js';
import { AccessProjectionQueue } from '../events/identity.queues.js';
import { IdentityEventsTopic } from '../events/identity.topics.js';
import { MembershipChangedEvent } from '../events/access.events.js';
import { ValidPayloads } from './utils/examples.js';

const events = Object.values(identityContract.events);
const forbiddenPayloadFields = ['code', 'secret', 'token'];

describe('identity events', () => {
  it('places every IdentityEvent in the identity topic', () => {
    const topicTypes = IdentityEventsTopic.events.map((event) => event.type);
    for (const type of Object.values(IdentityEvent)) {
      expect(topicTypes).toContain(type);
    }
    expect(topicTypes.length).toBe(Object.values(IdentityEvent).length);
  });

  it('subscribes the access projection only to membership changes', () => {
    expect(AccessProjectionQueue.name).toBe(IdentityQueue.AccessProjection);
    expect(AccessProjectionQueue.subscriptions).toHaveLength(1);
    const [subscription] = AccessProjectionQueue.subscriptions;
    expect(subscription.topic).toBe(IdentityEventsTopic);
    expect(subscription.events).toEqual([MembershipChangedEvent]);
    expect(identityContract.queues['accessProjection']).toBe(
      AccessProjectionQueue,
    );
  });

  it.each(events.map((event) => [event.type, event] as const))(
    'publishes %s as a versioned event',
    (type, event) => {
      expect(event.kind).toBe(MessageKind.Event);
      expect(type).toMatch(/\.v1$/);
      expect(event.description.trim().length).toBeGreaterThan(0);
    },
  );

  it.each(
    Object.entries(ValidPayloads).map(
      ([name, payload]) => [name, payload] as const,
    ),
  )('accepts a valid %s', (name, payload) => {
    const schema = identityContract.schemas[name] as z.ZodType;
    expect(validateContract(schema, payload).ok).toBe(true);
  });

  it.each(events.map((event) => [event.type, event.payload] as const))(
    'keeps codes, secrets and tokens out of %s',
    (_type, payload) => {
      const shape = (payload as z.ZodObject).shape;
      for (const field of forbiddenPayloadFields) {
        expect(Object.keys(shape)).not.toContain(field);
      }
    },
  );
});
