/** How far a unit of work got, to decide how to close the key on failure. */
export enum UnitStage {
  /** The unit of work did not open: nothing ran. */
  Begin = 'begin',
  Handler = 'handler',
  /** The result is stored inside the unit of work. */
  Complete = 'complete',
  /** The result is already stored and the unit of work is being committed. */
  Commit = 'commit',
}
