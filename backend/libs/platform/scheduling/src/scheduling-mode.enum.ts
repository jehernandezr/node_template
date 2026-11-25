/** How the periodic work of a process is triggered. */
export enum SchedulingMode {
  /** The `JobRunner` builds its own timers. */
  InProcess = 'in-process',
  /** No timers: EventBridge or an external cron calls `runNow`. */
  External = 'external',
}
