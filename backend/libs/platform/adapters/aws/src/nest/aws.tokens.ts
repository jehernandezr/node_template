/**
 * Clientes del SDK. Son `Symbol` porque son dos clientes de librerías
 * distintas que no comparten una clase abstracta propia.
 */
export const SNS_CLIENT = Symbol('SNS_CLIENT');
export const SQS_CLIENT = Symbol('SQS_CLIENT');
