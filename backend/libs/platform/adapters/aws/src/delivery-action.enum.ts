/** What happens to a delivery after processing it. */
export enum DeliveryAction {
  /** Deleted from the queue: processed, duplicated, ignored or already copied to the DLQ. */
  Acknowledge = 'acknowledge',
  /** Returns to the queue when its visibility expires. */
  Redeliver = 'redeliver',
}
