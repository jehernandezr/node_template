/** Cómo llega una llamada al servicio dueño de la operación. */
export enum InternalTransportKind {
  /** Por HTTP firmado hacia otro proceso. */
  Http = 'http',
  /** Directo al router del mismo proceso; es el modo local y el de las pruebas. */
  InProcess = 'in-process',
}
