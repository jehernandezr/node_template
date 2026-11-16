import { defineTopic } from '@contracts/platform';
import { ReportsTopic } from '../enums/identifiers.enum.js';
import { RunCompletedEvent } from './reports.events.js';

/** Tópico de los eventos de reports. Lo consume notifications. */
export const ReportsEventsTopic = defineTopic({
  name: ReportsTopic.Events,
  events: [RunCompletedEvent],
  description:
    'Eventos de reports: terminó una ejecución. Cada servicio suscribe su propia cola.',
});
