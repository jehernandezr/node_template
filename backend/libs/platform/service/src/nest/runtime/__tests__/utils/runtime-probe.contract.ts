import {
  defineEvent,
  defineServiceContract,
  defineTopic,
} from '@contracts/platform';
import { z } from 'zod';

/** Event the runtime probe publishes; its topic is declared by the contract. */
export const RuntimeProbeRecorded = defineEvent({
  type: 'runtime-probe.probe.recorded.v1',
  payload: z.object({ probeId: z.string() }),
  description: 'A runtime probe was recorded.',
});

export const RuntimeProbeEvents = defineTopic({
  name: 'runtime-probe-events',
  events: [RuntimeProbeRecorded],
  description: 'Runtime probe events.',
});

export const runtimeProbeContract = defineServiceContract({
  service: 'runtime-probe',
  description: 'Test service for the full runtime startup.',
  events: { probeRecorded: RuntimeProbeRecorded },
  topics: { runtimeProbeEvents: RuntimeProbeEvents },
});
