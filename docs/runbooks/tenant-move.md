# Moving a tenant

Moves a tenant to another shard group, in the same region or in another one, without losing or repeating writes. The design is in [ADR 0032](../adr/0032-tenant-moves-and-regions.md).

## Before

1. The target group is in `TENANT_MOVE_TARGETS` of the five services, with the region and logical shard of each one, and that shard is registered in the service's directory (`shard_instances`).
2. If the target is another region: `REGIONS` lists both regions in every service, each process declares its `SERVICE_REGION`, and its `AUTH_ISSUER` is the `issuer` of its region. Identity does not start if `REGIONS` declares regions and `SERVICE_REGION` is missing.
3. Migrations are applied on the target shards (`pnpm nx run <service>:migrate --args="--target=shards"`; inside a deployed image, `node migrate.mjs shards`).
4. The tenant has no sagas in progress: `sync` waits for them to finish and `finalize` fails with `PLATFORM.TENANT_MOVE.TENANT_BUSY` if one shows up.
5. With `TENANT_MOVE_STRATEGY=logical` (local only; deployed environments use `batch`, [ADR 0041](../adr/0041-secrets-and-database-credentials.md)), the source has `wal_level=logical`, the subscription role, locally the image's superuser `platform`, which bypasses RLS, can create subscriptions on the target, and the target can reach the source over the network (`TENANT_MOVE_REPLICATION_HOST` and `_PORT` if it is not the same address).

## Launch

```bash
pnpm nx run identity:tenant-move -- --tenant=<tenant id> --target=<target group>
```

The command launches the `MoveTenant` saga and runs it until it finishes or pauses; if it pauses, the identity worker resumes it. It prints the move id.

## Follow

- `tenant_moves` in the identity catalog: `Running`, `Switched`, `CleanedUp` or `Aborted`.
- The saga log on the platform tenant's shard (`saga.instances` and `saga.step_log`).
- During the last round, the tenant's writes wait up to `TENANT_MOVE_MAX_WAIT_MS` and then respond `PLATFORM.SHARDING.TENANT_MIGRATING` with `Retry-After`.

A round that does not catch up with the source responds `PLATFORM.TENANT_MOVE.ROUND_PENDING` and the saga repeats it. If a tenant writes faster than a round copies, raise `TENANT_MOVE_CAUGHT_UP_ROWS` or `TENANT_MOVE_CALL_BUDGET_MS` (each call, with its two copy parts, fits within that budget).

## If it fails

- Before the pivot, the saga compensates with `abort` on each service: it discards the copy, lowers the source barrier and opens the gate. The tenant stays where it was and the move can be launched again.
- `PLATFORM.TENANT_MOVE.VERIFICATION_FAILED`: the target did not end up equal to the frozen source. The saga compensates; check the log for the tables that differed before repeating.
- After the pivot, the saga repeats `switch` until it completes. If it ends up in `RequiresIntervention`, check the service whose `switch` fails: meanwhile its source stays alive and its barrier stops old writes.

## Cleanup

After `TENANT_MOVE_GRACE_DAYS` (7 by default), `identity.clean-up-tenant-moves` asks each service to delete the source. It repeats each service with a pause of `TENANT_MOVE_CLEANUP_PAUSE_MS` while it answers that its round is still going, up to `TENANT_MOVE_CLEANUP_MAX_ATTEMPTS` attempts per run; whatever remains is left for the next run. The move becomes `CleanedUp` when all five finish. `PLATFORM.TENANT_MOVE.NOT_SWITCHED` means that service's directory still routes the tenant to the source: do not delete by hand, finish the `switch` first.

## What does not move

`outbox` and `audit_log` stay on the source. Idempotency keys and processed messages older than their `tenant_id` migrations are covered only up to their TTL. The details are in ADR 0032.
