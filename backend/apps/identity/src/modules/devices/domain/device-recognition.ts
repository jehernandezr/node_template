import type { DeviceSnapshot } from './device-snapshot.js';

/** Result of recognizing the device proof that a sign-in carries. */
export interface DeviceRecognition {
  /** True if the proof is signed by a registered, trusted device of the same user. */
  readonly recognized: boolean;
  readonly device?: DeviceSnapshot;
}
