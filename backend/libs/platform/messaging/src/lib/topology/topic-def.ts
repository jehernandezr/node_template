/** Options for a topic. */
export interface TopicOptions {
  /** Ordered delivery. Defaults to false. */
  readonly fifo?: boolean;
}

/** A topic (fan-out point for events) of a {@link Topology}. */
export class TopicDef {
  readonly name: string;
  readonly fifo: boolean;

  constructor(name: string, options: TopicOptions = {}) {
    this.name = name;
    this.fifo = options.fifo ?? false;
  }
}
