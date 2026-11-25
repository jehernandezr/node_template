/** Options of a topic. */
export interface TopicOptions {
  /** Ordered delivery. Defaults to `false`. */
  readonly fifo?: boolean;
}

/** Topic of a {@link Topology}: the point where an event is fanned out to the queues. */
export class TopicDef {
  readonly name: string;
  readonly fifo: boolean;

  constructor(name: string, options: TopicOptions = {}) {
    this.name = name;
    this.fifo = options.fifo ?? false;
  }
}
