/** SQS record Lambda delivers (only the fields that are used). */
export interface SqsLambdaRecord {
  readonly messageId: string;
  readonly receiptHandle: string;
  readonly body: string;
  readonly attributes: {
    readonly ApproximateReceiveCount: string;
    readonly MessageGroupId?: string;
  };
}

/** Lambda SQS event. */
export interface SqsLambdaEvent {
  readonly Records: readonly SqsLambdaRecord[];
}

/** Lambda response with `ReportBatchItemFailures` enabled on the event source mapping. */
export interface SqsBatchResponse {
  readonly batchItemFailures: { readonly itemIdentifier: string }[];
}
