/** Una entrega, venga de Lambda o de `ReceiveMessage`. */
export interface SqsDelivery {
  readonly messageId: string;
  readonly receiptHandle: string;
  readonly body: string;
  /** Entregas hasta ahora, contando esta (`ApproximateReceiveCount`). */
  readonly receiveCount: number;
  readonly groupId?: string;
}
