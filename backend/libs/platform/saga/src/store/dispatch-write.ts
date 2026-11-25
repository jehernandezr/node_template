import type { StepLogEntry } from '../model/step-log-entry.js';
import type { FencedWrite } from './fenced-write.js';

/** Guarded write that records the dispatch of a step. */
export interface DispatchWrite extends FencedWrite {
  readonly step: StepLogEntry;
}
