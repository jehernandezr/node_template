import {
  deliveredTypes,
  MessageKind,
  validateContract,
} from '@contracts/platform';
import { IdentityEvent, PlanFeature } from '@contracts/identity';
import { billingContract } from '../contract.js';
import {
  BillingEvent,
  BillingQueue,
  BillingTopic,
} from '../enums/identifiers.enum.js';
import { UsageMetric } from '../enums/billing.enum.js';
import { BillingEventsTopic } from '../events/billing.topics.js';
import { RecordUsageCommand } from '../events/billing.commands.js';
import { IdentityEventsQueue, UsageQueue } from '../events/billing.queues.js';
import {
  Ids,
  Invoice,
  Now,
  Period,
  Price,
  UsageRecord,
  UuidV4,
} from './utils/fixtures.js';

const payloads = {
  [BillingEvent.SubscriptionChanged]: {
    tenantId: Ids.tenant,
    subscriptionId: Ids.other,
    previousPlanId: null,
    planId: Ids.item,
    changedAt: Now,
  },
  [BillingEvent.SubscriptionSuspended]: {
    tenantId: Ids.tenant,
    subscriptionId: Ids.other,
    suspendedAt: Now,
  },
  [BillingEvent.SubscriptionReactivated]: {
    tenantId: Ids.tenant,
    subscriptionId: Ids.other,
    reactivatedAt: Now,
  },
  [BillingEvent.EntitlementsChanged]: {
    tenantId: Ids.tenant,
    features: [PlanFeature.Billing],
    quotas: [{ metric: UsageMetric.Users, limit: 10 }],
    changedAt: Now,
  },
  [BillingEvent.InvoiceIssued]: {
    tenantId: Ids.tenant,
    invoiceId: Invoice.id,
    number: Invoice.number,
    period: Period,
    total: Price,
    issuedAt: Now,
  },
  [BillingEvent.InvoicePaid]: {
    tenantId: Ids.tenant,
    invoiceId: Invoice.id,
    number: Invoice.number,
    total: Price,
    paidAt: Now,
  },
  [BillingEvent.InvoiceFailed]: {
    tenantId: Ids.tenant,
    invoiceId: Invoice.id,
    number: Invoice.number,
    total: Price,
    attempts: 2,
    failedAt: Now,
  },
} as const;

const events = [
  [
    BillingEvent.SubscriptionChanged,
    billingContract.events.subscriptionChanged,
  ],
  [
    BillingEvent.SubscriptionSuspended,
    billingContract.events.subscriptionSuspended,
  ],
  [
    BillingEvent.SubscriptionReactivated,
    billingContract.events.subscriptionReactivated,
  ],
  [
    BillingEvent.EntitlementsChanged,
    billingContract.events.entitlementsChanged,
  ],
  [BillingEvent.InvoiceIssued, billingContract.events.invoiceIssued],
  [BillingEvent.InvoicePaid, billingContract.events.invoicePaid],
  [BillingEvent.InvoiceFailed, billingContract.events.invoiceFailed],
] as const;

describe('billing events and commands', () => {
  it('publishes the seven billing events on the billing topic', () => {
    const types = BillingEventsTopic.events.map((event) => event.type);
    expect([...types].sort()).toEqual(Object.values(BillingEvent).sort());
    expect(billingContract.topics.events).toBe(BillingEventsTopic);
    expect(BillingEventsTopic.name).toBe(BillingTopic.Events);
  });

  it.each(events.map(([type, event]) => [type, event] as const))(
    'accepts a valid payload for %s',
    (type, event) => {
      expect(event.kind).toBe(MessageKind.Event);
      expect(validateContract(event.payload, payloads[type]).ok).toBe(true);
    },
  );

  it.each(events.map(([type, event]) => [type, event] as const))(
    'rejects a tenant that is not v7 in %s',
    (type, event) => {
      expect(
        validateContract(event.payload, {
          ...payloads[type],
          tenantId: UuidV4,
        }).ok,
      ).toBe(false);
    },
  );

  it('requires the features and the quotas in the entitlements change', () => {
    const { payload } = billingContract.events.entitlementsChanged;
    const { tenantId, changedAt, quotas, features } =
      payloads[BillingEvent.EntitlementsChanged];
    expect(validateContract(payload, { tenantId, changedAt, quotas }).ok).toBe(
      false,
    );
    expect(
      validateContract(payload, { tenantId, changedAt, features }).ok,
    ).toBe(false);
  });

  it('receives the usage records in the FIFO usage queue', () => {
    expect(UsageQueue.name).toBe(BillingQueue.Usage);
    expect(UsageQueue.fifo).toBe(true);
    expect(UsageQueue.commands).toContain(RecordUsageCommand);
    expect(billingContract.queues.usage).toBe(UsageQueue);
  });

  it('delivers only the membership changes from identity', () => {
    expect(IdentityEventsQueue.name).toBe(BillingQueue.Identity);
    expect(deliveredTypes(IdentityEventsQueue)).toEqual([
      IdentityEvent.MembershipChanged,
    ]);
    expect(billingContract.queues.identityEvents).toBe(IdentityEventsQueue);
  });

  it('accepts a valid usage batch', () => {
    expect(
      validateContract(RecordUsageCommand.payload, {
        tenantId: Ids.tenant,
        records: [UsageRecord],
      }).ok,
    ).toBe(true);
  });

  it.each([
    ['an empty batch', { tenantId: Ids.tenant, records: [] }],
    [
      'a batch over the limit',
      {
        tenantId: Ids.tenant,
        records: Array.from({ length: 501 }, () => UsageRecord),
      },
    ],
    [
      'a negative quantity',
      {
        tenantId: Ids.tenant,
        records: [{ ...UsageRecord, quantity: -1 }],
      },
    ],
    [
      'an empty key',
      { tenantId: Ids.tenant, records: [{ ...UsageRecord, key: '' }] },
    ],
  ])('rejects a usage batch with %s', (_name, payload) => {
    expect(validateContract(RecordUsageCommand.payload, payload).ok).toBe(
      false,
    );
  });
});
