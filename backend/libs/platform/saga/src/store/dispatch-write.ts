import type { StepLogEntry } from '../model/step-log-entry.js';
import type { FencedWrite } from './fenced-write.js';

/** Escritura protegida que registra el despacho de un paso. */
export interface DispatchWrite extends FencedWrite {
  readonly step: StepLogEntry;
}
