// Único lugar del backend donde entra @aws-sdk/* (ADR 0002).
export * from './aws-config.js';
export * from './aws-clients.js';
export * from './aws-errors.js';
export * from './elasticache-iam-auth.js';
export * from './messaging-names.js';
export * from './sns-sqs-envelope-publisher.js';
export * from './sns-sqs-message-bus.js';
export * from './sqs-delivery-runner.js';
