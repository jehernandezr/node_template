import { ResilienceError } from './resilience-error.js';
import { ResilienceErrorCode } from './resilience-error-code.enum.js';

/** A policy's configuration does not meet its rules. It is a startup error. */
export class InvalidPolicyError extends ResilienceError {
  constructor(message: string) {
    super(ResilienceErrorCode.InvalidPolicy, message);
  }
}
