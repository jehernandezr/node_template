/** Qué pasa con una entrega después de procesarla. */
export enum DeliveryAction {
  /** Se borra de la cola: procesada, duplicada, ignorada o ya copiada a la DLQ. */
  Acknowledge = 'acknowledge',
  /** Vuelve a la cola cuando vence su visibilidad. */
  Redeliver = 'redeliver',
}
