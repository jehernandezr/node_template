/**
 * SDK clients. They are `Symbol` because they are two clients from different
 * libraries that do not share an abstract class of our own.
 */
export const SNS_CLIENT = Symbol('SNS_CLIENT');
export const SQS_CLIENT = Symbol('SQS_CLIENT');
