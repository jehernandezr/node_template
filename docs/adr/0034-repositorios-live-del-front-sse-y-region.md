# 0034. Live front repositories, SSE and region in the client

- Status: Accepted
- Date: 2026-11-24
- Related: [ADR 0011](0011-tiempo-real-socketio-sse.md), [ADR 0018](0018-contrato-de-microfrontend.md), [ADR 0027](0027-patrones-de-pantalla-y-pruebas-del-front.md), [ADR 0028](0028-tiempo-real-sobre-un-stream-por-usuario.md), [ADR 0032](0032-traslado-de-tenants-y-regiones.md)

## Context

With the tasks, notifications, reports and billing contracts published, their microfrontends stop being demo only. Connecting them raised decisions the design did not settle: how the screen types coexist with the generated ones, how the front reads the SSE stream that is not in the contract, what the client does when the tenant lives in another region, how a report is downloaded without new dependencies and how all of this is tested without a backend. The backend end-to-end flow that walks through these services together has its own [ADR 0035](0035-flujo-de-punta-a-punta-de-la-plataforma.md).

## Decision

- **One binding with two adapters.** Each microfrontend declares `RepositoryBinding(demo:, live:)`. The live adapter (`ApiTasksRepository`, `ApiNotificationsRepository`, `ApiBillingRepository`, `ApiReportsRepository`) uses `ApiClient` with the generated routes, so every request is validated against the contract before it leaves. The manifests stop declaring `modes: {demo}`. The fake stays for demo mode and tests.
- **Types.** Enums the contract already defines are re-exported from the microfrontend's `shared/enums` (`TaskStatus`, `NotificationType`, `NotificationChannel`, `Currency`, `UsageMetric`, `InvoiceStatus` and the rest of billing's); the microfrontend's own rules go in extensions (`NotificationTypeRules.isMandatory`). Screen types that add something (a `ClockTime`, a computed total, an invoice summary) stay, and a mapper per service builds them from the generated ones. Reports uses the generated types directly because the screen adds nothing to them.
- **Errors with meaning on the screen.** The adapter translates into its own exception only the code the screen handles differently: `TASKS.TASK.NOT_FOUND` to `TaskNotFoundException`, `REPORTS.RUN.NOT_FOUND` to `ReportRunNotFoundException` and `BILLING.INVOICE.NOT_FOUND` to `null` in `invoice(id)`. The rest arrives as `ApiErrorException` and is shown with `ErrorPresenter`. `ChangePlanController.isPlanRefused` flags `BILLING.QUOTA.EXCEEDED` and `BILLING.PLAN.USAGE_EXCEEDS_LIMIT` so that the sheet shows that code's text instead of the generic one.
- **SSE.** `SseNotificationsStream` reads `GET /v1/notifications/stream` (outside the contract, like `/health`) with `package:http`, and the current token and base of `ApiClient`. It reads the frames with `ServerSentEventReader`, validates each one against its generated schema and discards those that do not comply. When cut off it emits `StreamDisconnected` and reconnects with `Last-Event-ID` and a wait that doubles up to one minute (or the one `retry` sends); it remembers the ids of the last 256 frames and discards those the server resends, so a reconnection neither loses nor repeats notices. A `session-closed` frame ends the reconnections. `ApiNotificationsRepository` builds `live()` and `watchUnreadCount()` on that stream: the count starts from the API, follows the `unread-count` frames and reads the API again on every reconnection attempt and on every mark as read; a count that cannot be read is skipped without an error, because the lifecycle that listens to it has no one to show it to.
- **Region.** On a 421 with `PLATFORM.SHARDING.WRONG_REGION`, `ApiClient` repeats the request once against `details.apiBaseUrl` and keeps that base for the following ones, the SSE included. It only follows an absolute `https` URL, or `http` when the current base is already `http` (local): the token never travels to a scheme weaker than the original one. A second 421 reaches the caller. The front's `ProblemDetails` carries `details`.
- **Report download.** `ReportFileSaver` is a port with two adapters chosen by conditional import: in the browser it downloads the file with its name (`package:web`, which already came in through `package:http`), and outside it copies the content to the clipboard, because the mobile app has no folder of its own without adding dependencies. The screen says which of the two happened.
- **Polling.** `RunPolling` reads a run, or the list, again while any is queued or running, with a `Timer` that is cancelled in `dispose`; subsequent reads keep the data on screen.
- **Tests without a backend.** `ScriptedTransport` from `test_utils` responds in order or by route and records each request; `ScriptedApi.liveScope` builds a live scope on top of it. The apps' shared scenarios add a live one: after sign-in, tasks reads its API with the session token and follows the tenant to its region. `ShellHost.whenDisposed` lets tests wait for the app to finish releasing each identity's resources, like the SSE connection, before checking pending timers.

## Consequences

### Positive

- Screens do not change between demo and live; only the adapter the binding delivers changes.
- An enum change in the contract breaks the compilation of the microfrontend that uses it.
- A notice is neither lost nor repeated on reconnecting, and a tenant moved to another region keeps working without signing in again.

### Costs

- Each live adapter maintains a mapper with the screen types that add something.
- In the mobile app, downloading a report is a copy to the clipboard until a dependency for saving files is accepted.
- While the stream is down, the unread count is read on every reconnection attempt, with the same increasing wait.

## Alternatives considered

- Replacing every screen type with the generated ones: it lost the preferences' `ClockTime` and an invoice's total computed from its lines.
- Adding the stream to the contract: it is not a request with a response and the generator has no way to describe it.
- Following any `apiBaseUrl`: a compromised server could send the token to another scheme.
