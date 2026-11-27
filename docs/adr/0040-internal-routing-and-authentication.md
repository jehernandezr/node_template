# 0040. Internal routing and authentication per runtime

- Status: Accepted
- Date: 2026-11-26
- Related: [ADR 0020](0020-terraform-stacks-and-runtime-per-service.md), [ADR 0021](0021-valkey-adapter.md), [ADR 0039](0039-runtime-matrix-per-service.md)

## Context

Services call each other through `POST /internal/operations/:operationId` and require `INTERNAL_API_BASE_URLS`, which no stack produces. Three designs competed: Service Connect, Cloud Map and the internal ALB. Service Connect and Cloud Map do not reach Lambda, and the internal ALB cannot verify SigV4. Authentication is HMAC with one shared secret, which gives no caller identity, and `INTERNAL_API_SIGNER=sigv4` has a client but no verifier on the server.

## Decision

- **Routing: Amazon VPC Lattice.** The `platform` stack creates one service network per environment, associates the VPC and creates one Lattice service per entry of the service catalog, with an HTTPS listener whose default action answers 404. Each `service` stack adds a listener rule for `/internal/operations/*` that forwards to its target group: type `IP` for a Fargate API (attached through `vpc_lattice_configurations` of `aws_ecs_service`) or type `LAMBDA` for a Lambda API. The API target security group admits the container port only from the `com.amazonaws.<region>.vpc-lattice` managed prefix list.
- **Callers.** The API, the worker and the Lambda consumers call the same way: every component is in the VPC, and egress stays 443 only.
- **Base URLs.** `platform` outputs `internal_service_urls` (service name to `https://<lattice dns>`). The `service-base` stack builds `INTERNAL_API_BASE_URLS` with the entries of its callees only, so the one-off tasks get it too ([ADR 0043](0043-deploy-migrations-and-rollback.md)).
- **Callees come from code.** The contract export adds `callees` per service to `topology.json`, from the list each service passes to `SignedInternalHttp`. The drift check already covers `topology.json`.
- **Authentication in AWS: SigV4 with IAM.** Lattice auth type is `AWS_IAM`. The auth policy of each Lattice service allows `vpc-lattice-svcs:Invoke` only to the task and function roles of the services that list it as a callee, matched with `aws:PrincipalArn` against the role name pattern `<prefix>-<caller>-*`, so a callee can be applied before its caller's `service-base` on a first deploy. Callers sign with `INTERNAL_API_SIGNER=sigv4` and `INTERNAL_API_SIGV4_SERVICE=vpc-lattice-svcs` (a new `SigV4Service.VpcLattice`).
- **Server side.** `INTERNAL_API_AUTH=iam` selects a new `LatticeIdentityAuthenticator` in `@platform/internal-api`: it reads the caller role from the `x-amzn-lattice-identity` header, maps the role name `<prefix>-<service>-*` to the caller service, rejects unknown roles with 401, and puts the caller service in the call context for audit and traces. The header is trusted only because the target admits traffic from Lattice alone.
- **Locally and outside AWS: HMAC.** `INTERNAL_API_AUTH=hmac` keeps the shared secret. The verifier accepts `INTERNAL_API_SHARED_SECRET` and an optional `INTERNAL_API_SHARED_SECRET_PREVIOUS`, so a rotation overlaps. With `iam`, the shared secret is not required.
- **Never public.** The HTTP API only gets the `route_prefixes` of each service; a validation in the `service` stack rejects `/`, any prefix under `/internal` and any route or real-time pattern whose wildcard could reach it, real-time rules need a path pattern (a host alone would match `/internal`), and the internal ALB rules only match public prefixes.
- **Cross region.** F12 is single region ([ADR 0042](0042-region-and-catalog-model.md)). Calls to another region go, when a second region exists, to that region's HTTP API with an `AWS_IAM` route and `SigV4Service.ExecuteApi`; that is decided with the second region.
- **One SigV4 implementation.** `SigV4Signer` on `@smithy/signature-v4` signs every request; the hand-written signing of `ElastiCacheIamAuthTokenProvider` moves onto its `presign`.
- **Per-operation authorization** (which caller may call which operation) is not in F12. Lattice enforces service to service; the operation allowlist is a backlog item.

## Consequences

### Positive

- One path for every runtime pair, and caller identity from IAM instead of a shared secret.
- No private DNS zone, no internal certificates and no extra ingress rules besides the Lattice prefix list.

### Costs

- Lattice charges per service-hour and per request, about 20 USD a month per service at low traffic.
- `LambdaBootstrap` must accept the Lattice event format (version 2.0) for internal calls, besides the API Gateway one.
- LocalStack does not emulate Lattice: the path is proven only in the `dev` deploy.

## Alternatives considered

- Service Connect with a `<svc>.internal` alias (general review): no Lambda, and still no caller identity.
- Internal ALB with host-header rules: needs a private certificate or plain HTTP, and cannot verify SigV4.
- Per-caller HMAC secrets: identity is "whoever holds the key", and every callee holds every caller's key.
