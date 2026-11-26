/**
 * SDK clients. They are `Symbol` because they are clients from different
 * libraries that do not share an abstract class of our own.
 */
export const SNS_CLIENT = Symbol('SNS_CLIENT');
export const SQS_CLIENT = Symbol('SQS_CLIENT');
export const SES_CLIENT = Symbol('SES_CLIENT');
