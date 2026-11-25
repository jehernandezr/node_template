/** A delivery, whether from Lambda or from `ReceiveMessage`. */
export interface SqsDelivery {
  readonly messageId: string;
  readonly receiptHandle: string;
  readonly body: string;
  /** Deliveries so far, counting this one (`ApproximateReceiveCount`). */
  readonly receiveCount: number;
  readonly groupId?: string;
}
