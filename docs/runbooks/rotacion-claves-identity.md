# Rotating the identity signing keys

Identity signs access tokens with ES256. The keys live in the `IDENTITY_SIGNING_KEYS` variable, which in AWS comes from a Secrets Manager secret declared in `secrets` of the service's stack. The other services verify with the public JWKS (`GET /v1/auth/jwks`) and never see the private key ([ADR 0022](../adr/0022-verificacion-de-tokens-y-estado-de-revocacion-compartido.md)).

## How the keys are read

`IDENTITY_SIGNING_KEYS` is a JSON array of private P-256 JWKs (`kty: EC`, `crv: P-256`, `d`, `x`, `y`), each with its `kid` and an optional `status`:

| `status`    | Signs new tokens | Published in the JWKS | Use                                                              |
| ----------- | ---------------- | --------------------- | ---------------------------------------------------------------- |
| `active`    | Yes              | Yes                   | The current key. There must be exactly one.                      |
| `verifying` | No               | Yes                   | The key coming in before activation or going out after rotation. |
| `retired`   | No               | No                    | A compromised or expired key.                                    |

Without `status`, the first key in the array is the active one and the rest are `verifying`. Identity does not start if there is not exactly one active key or if two keys repeat a `kid`.

## Timings that matter

| Timing                      | Value                                      | Where it comes from                                            |
| --------------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| Access token lifetime       | Between 10 and 15 min (`ACCESS_TOKEN_TTL`) | Identity configuration                                         |
| JWKS cache in each service  | 5 min                                      | `RemoteJwksKeySource.TTL_MS` in `@platform/auth`               |
| Reload for an unknown `kid` | At most one every 30 s                     | `RemoteJwksKeySource.MIN_RELOAD_MS`                            |
| JWKS HTTP cache             | `Cache-Control: public, max-age=300`       | Response of `GET /v1/auth/jwks`                                |
| Overlap of the outgoing key | 30 min                                     | This runbook: covers the maximum token lifetime plus the cache |

## Planned rotation

It takes three deployments. Between each one, respect the stated wait.

1. **Generate the new key** on a trusted machine, never in CI or in a chat:

   ```sh
   node -e "const c=require('node:crypto');const {privateKey}=c.generateKeyPairSync('ec',{namedCurve:'P-256'});console.log(JSON.stringify({...privateKey.export({format:'jwk'}),kid:c.randomBytes(8).toString('base64url'),status:'verifying'}))"
   ```

2. **Publish it as `verifying`.** Add the JWK at the end of the secret's array, without touching the active key, and deploy identity. Check that `GET /v1/auth/jwks` lists both `kid` values. Wait at least 5 minutes so every service has the new JWKS in its cache.
3. **Activate it.** Change the new key to `active` and the previous one to `verifying`, and deploy. From then on new tokens carry the new `kid` and the previous ones keep verifying.
4. **Retire the previous one.** After 30 minutes, change the previous key to `retired` (or remove it from the array) and deploy. No valid token signed with it remains.

If a step fails, go back to the array from the previous step: as long as the outgoing key stays `verifying`, no token stops verifying.

## Emergency rotation

When a private key is exposed:

1. Generate a new key as in step 1 of the planned rotation, with `status: 'active'`.
2. In the same secret change, mark the compromised key as `retired` and deploy identity. The JWKS stops publishing it and new tokens are issued with the new key.
3. Restart the other services, or wait 5 minutes, so their JWKS cache stops accepting the retired `kid`. Meanwhile, a token signed with that key still verifies on a replica with the old cache.
4. If there are signs of forged tokens, also revoke by epoch: the internal operation `identity.sessions.revoke-for-user.v1` for the affected users, or suspending the tenant; both reject every token issued before the moment of revocation.

Clients do not lose their session: the session token is opaque and does not depend on the signing key, so the next refresh issues an access token with the new key.

## Checks

- `GET /v1/auth/jwks` responds 200 with the expected `kid` values and never includes `d`.
- Service logs show no spikes of `PLATFORM.AUTH.UNAUTHENTICATED` after each deployment.
- The private key does not appear in the repository, the logs or the terminal history: the secret is edited in Secrets Manager.
