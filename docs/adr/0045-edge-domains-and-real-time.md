# 0045. Edge, domains and real time

- Status: Accepted
- Date: 2026-11-26
- Related: [ADR 0011](0011-real-time-socketio-sse.md), [ADR 0028](0028-real-time-one-stream-per-user.md), [ADR 0034](0034-live-front-repositories-sse-region.md)

## Context

The real-time ALB is public, outside CloudFront and WAF, with `TRUST_PROXY_HOPS=2`, so the client IP can be spoofed. The tfvars have no real-time certificate. `REALTIME_AUTH=cookie` reads a cookie no service issues. The web is published with year-long `immutable` caching on files whose names carry no hash. ARCHITECTURE says SSE uses the session cookie and is served by `realtime`, while the front sends a bearer token to `notifications`.

## Decision

- **Domains.** `common.tfvars` sets `domain`. Web at `app.<env>.<domain>` and API at `api.<env>.<domain>`; prod drops `<env>`. A later region uses `<code>.api.<domain>`. One ACM certificate in `us-east-1` for CloudFront (`global` stack, [ADR 0042](0042-region-and-catalog-model.md)). The real-time ALB is reached at the origin hostname `realtime-<code>.<env>.<domain>` (prod drops `<env>`); the `platform` stack owns its regional ACM certificate, validated by DNS, and its alias record, because it owns the ALB listener.
- **Real time behind CloudFront.** The API distribution routes `/v1/notifications/stream` and `/socket.io/*` to the real-time ALB, everything else to the HTTP API. The ALB admits only the CloudFront origin-facing managed prefix list and requires `X-Origin-Verify` in its listener rule. The origin read timeout is 60 s and the SSE heartbeat is 20 s. CloudFront standard access logs go to the environment log bucket. The services take the client IP from `CloudFront-Viewer-Address`, and `TRUST_PROXY_HOPS` is removed.
- **Who serves real time.** In deployed environments, the `realtime` component of `notifications` (`REALTIME_HOST=service`). `apps/realtime` is the alternative ([ADR 0039](0039-runtime-matrix-per-service.md)).
- **Authentication.** Bearer token in both transports (`REALTIME_AUTH=bearer`): the front reads SSE with `package:http` and sends `Authorization`. The cookie authenticator is removed. The real-time app uses `HttpApplicationSetup`, so it has CORS and the security headers.
- **Web hosting.** S3 behind the web distribution. `index.html`, `flutter_bootstrap.js`, `main.dart.js` and the deferred `.part.js` files are `no-cache`; only paths that carry a version or a hash are `immutable`. Source maps are not published. Old files are not deleted on publish; a lifecycle rule removes objects not referenced for 30 days. The API base URL is set per environment with `--dart-define=API_BASE_URL`.
- **Mobile in F12** is build and sign only. Signing secrets live in a `mobile-release` GitHub environment limited to `main` and release tags; without them the workflow fails instead of signing with the debug key. Store publishing waits for the store accounts.

## Consequences

### Positive

- One WAF and one origin secret cover the API and real time, and the client IP comes from CloudFront.
- A web release never mixes old and new chunks in a browser.

### Costs

- CloudFront caps origin reads, so real time depends on the heartbeat staying below the timeout.
- Two certificates per environment, one of them in `us-east-1`.

## Alternatives considered

- Keeping the public ALB with its own WAF: two edges to configure and the IP problem stays.
- Cookie authentication for SSE: needs a cookie issued for the API domain, and the front already sends the token.
