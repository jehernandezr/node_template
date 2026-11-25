import { defineTopic } from '@contracts/platform';
import { TasksTopic } from '../enums/identifiers.enum.js';
import {
  TaskCreatedEvent,
  TaskDeletedEvent,
  TaskUpdatedEvent,
} from './tasks.events.js';

/** Topic of the tasks events. Consumed by notifications and reports, each in its own queue. */
export const TasksEventsTopic = defineTopic({
  name: TasksTopic.Events,
  events: [TaskCreatedEvent, TaskUpdatedEvent, TaskDeletedEvent],
  description:
    'Tasks events: creation, change and deletion of tasks. Each service subscribes its own queue.',
});
