/** SDK operation that failed, for the error message. */
export enum AwsOperation {
  Publish = 'sns:Publish',
  SendMessage = 'sqs:SendMessage',
  GetQueueUrl = 'sqs:GetQueueUrl',
  ReceiveMessage = 'sqs:ReceiveMessage',
  DeleteMessageBatch = 'sqs:DeleteMessageBatch',
  ChangeMessageVisibility = 'sqs:ChangeMessageVisibility',
  SendEmail = 'ses:SendEmail',
}
