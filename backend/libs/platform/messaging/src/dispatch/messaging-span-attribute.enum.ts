/** Attributes of the consumer span of each delivery (OpenTelemetry semantic conventions). */
export enum MessagingSpanAttribute {
  OperationType = 'messaging.operation.type',
  DestinationName = 'messaging.destination.name',
  MessageId = 'messaging.message.id',
  EventType = 'cloudevents.event_type',
}
