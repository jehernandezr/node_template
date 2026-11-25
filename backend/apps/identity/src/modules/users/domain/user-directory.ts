import type { UserLookup } from './user-lookup.js';

/** Global index of emails in the catalog (`identity_lookup`): one email per platform. */
export abstract class UserDirectory {
  /**
   * Reserves the email.
   * @param lookup Entry to reserve.
   * @returns `false` if another user already has it.
   */
  abstract reserve(lookup: UserLookup): Promise<boolean>;

  /**
   * Marks a reservation as an active account.
   * @param fingerprint Fingerprint of the email.
   */
  abstract activate(fingerprint: Buffer): Promise<void>;

  /**
   * Frees a reservation that never got a user.
   * @param fingerprint Fingerprint of the email.
   * @param userId User the reservation was for.
   */
  abstract release(fingerprint: Buffer, userId: string): Promise<void>;
  /**
   * Deletes the row of the user, in any status: their email no longer leads to them.
   * @param userId User.
   */
  abstract forget(userId: string): Promise<void>;

  /**
   * Finds the entry of an email.
   * @param fingerprint Fingerprint of the email.
   * @returns The entry, or `undefined`.
   */
  abstract findByFingerprint(
    fingerprint: Buffer,
  ): Promise<UserLookup | undefined>;

  /**
   * Finds the entry of a user.
   * @param userId User.
   * @returns The entry, or `undefined`.
   */
  abstract findByUserId(userId: string): Promise<UserLookup | undefined>;

  /**
   * Moves the entry of the user from one email to another.
   * @param userId User.
   * @param from Fingerprint of the current email.
   * @param to Fingerprint of the new email.
   * @returns `false` if the new email belongs to another user or the user has no entry under `from`.
   */
  abstract moveEmail(
    userId: string,
    from: Buffer,
    to: Buffer,
  ): Promise<boolean>;

  /**
   * Deletes the reservations older than `before`.
   * @param before Cut-off instant.
   * @returns How many it deleted.
   */
  abstract sweepReserved(before: Date): Promise<number>;

  /**
   * Points to `region` the entries of the users whose home tenant is `homeTenantId`.
   * @param homeTenantId Relocated home tenant.
   * @param region New region.
   */
  abstract relocateHomeTenant(
    homeTenantId: string,
    region: string,
  ): Promise<void>;
}
