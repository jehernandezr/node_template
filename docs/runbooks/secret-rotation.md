# Rotating service secrets

Each secret has one owner stack, listed in [ADR 0041](../adr/0041-secrets-and-database-credentials.md). A service's own secrets live in its `service-base` stack: each variable of `generated_secrets` is a Secrets Manager secret that Terraform fills once with an ephemeral random value through a write-only attribute, so no value reaches a plan, a state, the tfvars or the repository. There is no `secrets` block to fill by hand: `secrets` in the tfvars is only for a secret created outside the stack. The identity signing keys have their own runbook: [rotating the identity keys](identity-key-rotation.md).

## How a new value reaches the services

- Fargate injects each secret at task start (`valueFrom`), so a new value needs a forced new deployment of every ECS service of the service (`aws ecs update-service --force-new-deployment`, or a deploy).
- Lambda reads `SECRETS_MAP` once per execution environment, before validating the configuration. A deploy starts new execution environments; without one, a warm environment keeps the old value until Lambda recycles it.

## Internal API secret

`INTERNAL_API_SHARED_SECRET` signs internal calls with HMAC when `INTERNAL_API_SIGNER=hmac` (local and tests). It is never created in AWS, where calls are meant to be signed with SigV4 and each service's role ([ADR 0040](../adr/0040-internal-routing-and-authentication.md)), so there is no secret to rotate there. Until that signing is in place, a deployed service still runs with `INTERNAL_API_SIGNER=hmac` and has no source for the secret, so it does not start.

With HMAC there is one secret for all services. `INTERNAL_API_SHARED_SECRET_PREVIOUS` holds a second value that incoming calls may still be signed with; nothing is signed with it. A rotation overlaps both values, so the services can be deployed one at a time with no failed call:

1. Generate the new value (`openssl rand -base64 32`). Set it as `INTERNAL_API_SHARED_SECRET_PREVIOUS` on every service, keep `INTERNAL_API_SHARED_SECRET` as it is, and deploy them in any order. Each one now accepts both values and still signs with the old one.
2. Swap them: the new value becomes `INTERNAL_API_SHARED_SECRET` and the old one `INTERNAL_API_SHARED_SECRET_PREVIOUS`. Deploy the services in any order. A service already deployed signs with the new value, and every service accepts both.
3. Once every service runs step 2, remove `INTERNAL_API_SHARED_SECRET_PREVIOUS` and deploy again. Only the new value is accepted.

Check after each step that no saga ended up in `RequiresIntervention` because of rejected calls (`PLATFORM.INTERNAL_API.UNAUTHENTICATED` in the logs).

## Identity peppers and data keys

`IDENTITY_EMAIL_PEPPER`, `IDENTITY_TOKEN_PEPPER`, `IDENTITY_API_KEY_PEPPER`, `IDENTITY_DEVICE_ID_KEY` and `IDENTITY_DATA_KEY` (identity) and `NOTIFICATIONS_EMAIL_PEPPER` (notifications) are `generated_secrets` of their `service-base` stack. They protect stored data: changing one makes the existing hashes or encryption unreadable, so Terraform writes them once and never changes them (`secret_string_wo_version = 1`). They are not rotated in place. If one is compromised, treat it as an incident: invalidate sessions and API keys, and plan a migration that recomputes every value with the new one.

## Database credentials

The `<service>_owner` and `<service>_app` passwords are secrets of the `data` stack, which its rotation Lambda rotates every 30 days; only RDS Proxy, the rotation and the bootstrap Lambdas read them. Services never see them: they reach RDS Proxy with IAM tokens (`DB_AUTH=iam`), and the proxy follows the rotation by itself. A rotation needs no restart; check `GET /health/ready` afterwards.

## OpenObserve root user

The `platform` stack writes the root password and the OTLP `Authorization` header built from it once, from an ephemeral value, so neither is in its state. To change them, put a new version of the secret with both keys (`ZO_ROOT_USER_PASSWORD` and `OTLP_AUTHORIZATION`), change the root password in OpenObserve to the same value, then force a new deployment of every service, whose collector sidecar reads the header at start.

## X-Origin-Verify

The `platform` stack owns it and CloudFront sends it from the `edge` stack. Bump `origin_verify_secret_version`, apply `platform`, wait at least 5 minutes and apply `edge`: the previous value moves to `AWSPREVIOUS` and the authorizer accepts both, reloading the secret every 5 minutes. Do not rotate again before applying `edge`.

## Smoke account

Outside `prod`, the deploy job writes fresh credentials to identity's `SMOKE_ACCOUNT` secret before every `seed` ([ADR 0043](../adr/0043-deploy-migrations-and-rollback.md)), so it rotates on every deploy. Its resource policy lets only the deploy role write it, delete it or change that policy, and only the deploy role and the execution role of the seed task read it. `prod` has no smoke account.
