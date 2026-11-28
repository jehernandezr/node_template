# Rotating service secrets

Each service's secrets come from Secrets Manager through the `secrets` block of the service's stack and arrive as environment variables. None of them is written to the repository. The identity signing keys have their own runbook: [rotating the identity keys](identity-key-rotation.md).

## Internal API secret

`INTERNAL_API_SHARED_SECRET` signs internal calls with HMAC when `INTERNAL_API_SIGNER=hmac` (local and tests). In AWS, calls are signed with SigV4 and each service's role, so there is no secret to rotate.

With HMAC there is a single secret for all services: rotating it is a cutover. Do it in a window with no sagas running:

1. Generate the new value (`openssl rand -base64 32`) and store it in the secret.
2. Deploy the five services at the same time. While versions coexist, a call signed with the old secret gets a 401 and the saga retries it later.
3. Check that no saga ended up in `RequiresIntervention` because of rejected calls.

## Identity peppers and data keys

`IDENTITY_EMAIL_PEPPER`, `IDENTITY_TOKEN_PEPPER`, `IDENTITY_API_KEY_PEPPER`, `IDENTITY_DEVICE_ID_KEY` and `IDENTITY_DATA_KEY` protect stored data: changing them makes the existing hashes or encryption unreadable. They are not rotated in place. If one is compromised, treat it as an incident: invalidate sessions and API keys, and plan a migration that recomputes every value with the new one.

## Database credentials

The `<service>_owner` and `<service>_app` passwords are secrets that the `data` stack rotates every 30 days; only RDS Proxy, the rotation and the bootstrap Lambdas read them. Services never see them: they reach RDS Proxy with IAM tokens (`DB_AUTH=iam`, [ADR 0041](../adr/0041-secrets-and-database-credentials.md)), and the proxy follows the rotation by itself. A rotation needs no restart; check `GET /health/ready` afterwards.
