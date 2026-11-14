/** Métricas que publica el `JobRunner`. */
export enum SchedulingMetric {
  /** Contador de corridas por job y resultado. */
  Runs = 'platform.scheduling.runs',
  /** Histograma de la duración de cada corrida, en milisegundos. */
  RunDuration = 'platform.scheduling.run.duration',
}

/** Atributos de las métricas del `JobRunner`. */
export enum SchedulingMetricAttribute {
  Job = 'job',
  Result = 'result',
}

/** Resultado de una corrida. */
export enum JobRunResult {
  Succeeded = 'succeeded',
  Failed = 'failed',
  /** Un job exclusivo no corrió porque otro proceso tiene el lock. */
  Skipped = 'skipped',
}
