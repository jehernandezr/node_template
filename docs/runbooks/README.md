# Runbooks

Procedures for operating the platform. Each one says when to use it, what to check first, the steps, and how to know it is done.

| Runbook                                                | When                                                                    |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| [Operating the services](service-operations.md)        | Check health, jobs, queues, DLQs and configuration of any service       |
| [Moving a tenant](tenant-move.md)                      | Move a tenant to another shard group or another region                  |
| [Rotating the identity keys](identity-key-rotation.md) | Rotate the signing keys for access tokens                               |
| [Rotating service secrets](secret-rotation.md)         | Rotate the internal API secret, the peppers or the database credentials |
