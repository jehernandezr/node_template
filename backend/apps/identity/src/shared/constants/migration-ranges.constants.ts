/**
 * First migration timestamp of each module. Within its block, a module counts up by 1.
 * The platform timestamps are lower, so its migrations run first.
 */
export enum MigrationRange {
  Users = 1_795_000_100_000,
  Passwords = 1_795_000_200_000,
  Authentication = 1_795_000_300_000,
  Devices = 1_795_000_400_000,
  Mfa = 1_795_000_500_000,
  Passkeys = 1_795_000_600_000,
  Sessions = 1_795_000_700_000,
  Tenants = 1_795_000_800_000,
  Access = 1_795_000_900_000,
  Invitations = 1_795_001_000_000,
  ApiKeys = 1_795_001_100_000,
  Sagas = 1_795_001_200_000,
  TenantMoves = 1_795_001_300_000,
  // generated:modules
}
