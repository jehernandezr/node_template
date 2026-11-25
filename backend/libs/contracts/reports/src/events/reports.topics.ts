import { defineTopic } from '@contracts/platform';
import { ReportsTopic } from '../enums/identifiers.enum.js';
import { RunCompletedEvent } from './reports.events.js';

/** Topic of the reports events. Consumed by notifications. */
export const ReportsEventsTopic = defineTopic({
  name: ReportsTopic.Events,
  events: [RunCompletedEvent],
  description:
    'Reports events: a run finished. Each service subscribes its own queue.',
});
