/**
 * The only place in the backend where @aws-sdk/* is allowed (ADR 0002).
 */
export * from './aws.config.js';
export * from './aws-client-factory.js';
export * from './aws-credentials.js';
export * from './aws-credentials-provider.js';
export * from './aws-error-translator.js';
export * from './aws-messaging-names.js';
export * from './aws-operation.enum.js';
export * from './dead-letter-attribute.enum.js';
export * from './delivery-action.enum.js';
export * from './delivery-report.js';
export * from './elasticache-iam-auth-token-provider.js';
export * from './sdk-client-credentials-provider.js';
export * from './sns-sqs-envelope-publisher.js';
export * from './sns-sqs-message-bus.js';
export * from './sqs-consumer-config.js';
export * from './sqs-dead-letter-redriver.js';
export * from './sqs-delivery.js';
export * from './sqs-delivery-mapper.js';
export * from './sqs-delivery-processor.js';
export * from './sqs-lambda-event.js';
export * from './sqs-lambda-handler.js';
export * from './sqs-poller.js';
export * from './sigv4/internal-request-signer-selector.js';
export * from './sigv4/node-sha256.js';
export * from './sigv4/sigv4.config.js';
export * from './sigv4/sigv4-service.enum.js';
export * from './sigv4/sigv4-signer.js';
export * from './sigv4/sigv4-signer-settings.js';
export * from './ses/outbound-email.js';
export * from './ses/ses-email-client.js';
