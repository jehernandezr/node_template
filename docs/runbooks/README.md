# Runbooks

Procedures for operating the platform. Each one says when to use it, what to check first, the steps, and how to know it is done.

| Runbook                                                   | When                                                                    |
| --------------------------------------------------------- | ----------------------------------------------------------------------- |
| [Operating the services](operacion-de-servicios.md)       | Check health, jobs, queues, DLQs and configuration of any service       |
| [Moving a tenant](traslado-de-tenant.md)                  | Move a tenant to another shard group or another region                  |
| [Rotating the identity keys](rotacion-claves-identity.md) | Rotate the signing keys for access tokens                               |
| [Rotating service secrets](rotacion-de-secretos.md)       | Rotate the internal API secret, the peppers or the database credentials |
