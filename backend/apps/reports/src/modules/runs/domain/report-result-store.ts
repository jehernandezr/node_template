import type { ReportResult } from '@contracts/reports';

/** Dónde vive el resultado de cada ejecución del tenant del `ShardScope` abierto, hasta que vence. */
export abstract class ReportResultStore {
  abstract save(runId: string, result: ReportResult): Promise<void>;
  /** El resultado guardado, o `undefined` si no hay o ya se borró. */
  abstract load(runId: string): Promise<ReportResult | undefined>;
  abstract discard(runId: string): Promise<void>;
}
