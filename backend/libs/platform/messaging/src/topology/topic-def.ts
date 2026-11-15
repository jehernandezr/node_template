/** Opciones de un tópico. */
export interface TopicOptions {
  /** Entrega ordenada. Por defecto, `false`. */
  readonly fifo?: boolean;
}

/** Tópico de una {@link Topology}: el punto donde un evento se reparte a las colas. */
export class TopicDef {
  readonly name: string;
  readonly fifo: boolean;

  constructor(name: string, options: TopicOptions = {}) {
    this.name = name;
    this.fifo = options.fifo ?? false;
  }
}
