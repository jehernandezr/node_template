/** El servicio dueño de los datos que se copian a una proyección. */
export enum BackfillSource {
  Tasks = 'tasks',
  Invoices = 'invoices',
}

/** Hasta dónde se rellenó una proyección del tenant del `ShardScope` abierto. */
export interface Backfill {
  readonly cursor?: string;
  readonly completed: boolean;
}

/** Avance del relleno de cada tenant, con un cursor por fuente. */
export abstract class BackfillProgress {
  abstract find(source: BackfillSource): Promise<Backfill>;
  abstract save(source: BackfillSource, backfill: Backfill): Promise<void>;
}
