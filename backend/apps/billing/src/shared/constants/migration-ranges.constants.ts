/** First migration timestamp of each module. Within its block, a module increments by 1. */
export enum MigrationRange {
  Plans = 1_796_200_100_000,
  Subscriptions = 1_796_200_200_000,
  Usage = 1_796_200_300_000,
  Invoices = 1_796_200_400_000,
  Payments = 1_796_200_500_000,
  // generated:modules
}
