import { defineQueue } from '@contracts/platform';
import {
  IdentityEventsTopic,
  MembershipChangedEvent,
} from '@contracts/identity';
import { BillingQueue } from '../enums/identifiers.enum.js';
import { RecordUsageCommand } from './billing.commands.js';

/**
 * Cola FIFO de los registros de uso. El grupo de mensajes es el tenant, así los
 * lotes de un mismo tenant se aplican en orden.
 */
export const UsageQueue = defineQueue({
  name: BillingQueue.Usage,
  fifo: true,
  commands: [RecordUsageCommand],
  description: 'Lotes de uso que envían los servicios que miden.',
});

/** Cambios de membresía de identity, para el conteo de usuarios facturables. */
export const IdentityEventsQueue = defineQueue({
  name: BillingQueue.Identity,
  subscriptions: [
    {
      topic: IdentityEventsTopic,
      events: [MembershipChangedEvent],
    },
  ],
  description:
    'Cambios de membresía que alimentan el conteo de usuarios facturables.',
});
