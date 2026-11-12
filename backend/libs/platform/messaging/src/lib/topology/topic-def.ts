/** Options for a topic. */
export interface TopicOptions {
  /** Ordered delivery. Defaults to false. */
  readonly fifo?: boolean;
}

/** Declares a topic (fan-out point for events). */
export class TopicDef {
  readonly name: string;
  readonly fifo: boolean;

  constructor(name: string, options: TopicOptions = {}) {
    this.name = name;
    this.fifo = options.fifo ?? false;
  }
}
