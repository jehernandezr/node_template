import { defineTopic } from '@contracts/platform';
import { TasksTopic } from '../enums/identifiers.enum.js';
import {
  TaskCreatedEvent,
  TaskDeletedEvent,
  TaskUpdatedEvent,
} from './tasks.events.js';

/** Tópico de los eventos de tasks. Lo consumen notifications y reports, cada uno en su cola. */
export const TasksEventsTopic = defineTopic({
  name: TasksTopic.Events,
  events: [TaskCreatedEvent, TaskUpdatedEvent, TaskDeletedEvent],
  description:
    'Eventos de tasks: creación, cambio y borrado de tareas. Cada servicio suscribe su propia cola.',
});
