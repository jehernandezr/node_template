// Único lugar del backend donde entra @aws-sdk/* (ADR 0002).
export * from './lib/aws-config.js';
export * from './lib/aws-clients.js';
export * from './lib/aws-errors.js';
export * from './lib/messaging-names.js';
export * from './lib/sns-sqs-envelope-publisher.js';
export * from './lib/sns-sqs-message-bus.js';
export * from './lib/sqs-delivery-runner.js';
