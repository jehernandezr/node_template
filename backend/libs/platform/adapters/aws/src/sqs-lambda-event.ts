/** Registro SQS que entrega Lambda (solo los campos que se usan). */
export interface SqsLambdaRecord {
  readonly messageId: string;
  readonly receiptHandle: string;
  readonly body: string;
  readonly attributes: {
    readonly ApproximateReceiveCount: string;
    readonly MessageGroupId?: string;
  };
}

/** Evento SQS de Lambda. */
export interface SqsLambdaEvent {
  readonly Records: readonly SqsLambdaRecord[];
}

/** Respuesta de Lambda con `ReportBatchItemFailures` activado en el event source mapping. */
export interface SqsBatchResponse {
  readonly batchItemFailures: { readonly itemIdentifier: string }[];
}
