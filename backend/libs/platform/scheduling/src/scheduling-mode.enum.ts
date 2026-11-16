/** Cómo se dispara el trabajo periódico de un proceso. */
export enum SchedulingMode {
  /** El `JobRunner` arma sus propios temporizadores. */
  InProcess = 'in-process',
  /** Sin temporizadores: EventBridge o un cron externo llama a `runNow`. */
  External = 'external',
}
