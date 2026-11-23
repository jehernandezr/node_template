/** Operación del SDK que falló, para el mensaje del error. */
export enum AwsOperation {
  Publish = 'sns:Publish',
  SendMessage = 'sqs:SendMessage',
  GetQueueUrl = 'sqs:GetQueueUrl',
  ReceiveMessage = 'sqs:ReceiveMessage',
  DeleteMessageBatch = 'sqs:DeleteMessageBatch',
  ChangeMessageVisibility = 'sqs:ChangeMessageVisibility',
  SendEmail = 'ses:SendEmail',
}
