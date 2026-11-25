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
  description: 'Se registró una sonda del runtime.',
});

export const RuntimeProbeEvents = defineTopic({
  name: 'runtime-probe-events',
  events: [RuntimeProbeRecorded],
  description: 'Eventos de la sonda del runtime.',
});

export const runtimeProbeContract = defineServiceContract({
  service: 'runtime-probe',
  description: 'Servicio de prueba para el arranque completo del runtime.',
  events: { probeRecorded: RuntimeProbeRecorded },
  topics: { runtimeProbeEvents: RuntimeProbeEvents },
});
