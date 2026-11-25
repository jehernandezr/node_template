# mf_assistant

AI assistant microfrontend. It exposes `assistantManifest` and the routes under `/assistant`:

- `/assistant`: list of conversations and a "Nueva conversación" button.
- `/assistant/:conversationId`: chat with streaming answers, a stop button, sources (citations), tool confirmation and errors with code and traceId.

Screens are declared with `ScreenRoute.deferred` and `AssistantScreens`, which are loaded lazily. Each screen gets its repository with `scope.repository(AssistantData.repository)`, so each identity has its own and the scope releases it when it closes, which cuts off answers in progress.

## Texts

Own texts live in `lib/src/l10n/` (`app_es.arb` template and `app_en.arb`) and are generated with `flutter gen-l10n` into `lib/src/l10n/generated/` (class `AssistantLocalizations`). Shared words come from `AppLocalizations` in the `i18n` package.

## Data

`AssistantRepository` (`lib/src/data/`) defines `ask` as `Stream<AssistantChunk>`: text in chunks, an optional `ToolConfirmationRequest` that pauses the stream until the user confirms or rejects, and an `AssistantFinalChunk` with citations and token usage. Errors arrive as `ApiErrorException` (`contracts` package) with the API's `ProblemDetails`: code and traceId.

`AssistantData.repository` is a `RepositoryBinding.demoOnly` that provides a `FakeAssistantRepository` with a `DemoBehavior` of 300 ms latency. The fake simulates SSE and its `DemoBehavior` allows programming latency and failures per `AssistantOperation` (list, create, load history and ask). `chunkDelay` only sets the pace of the fragments of an answer.

Depending on the word in the message, the fake answers like this:

- `cuota`: `ApiErrorException` with code `BILLING.QUOTA.EXCEEDED`.
- `tarea`: asks to confirm the `crear_tarea` tool.
- Anything else: an answer in chunks with two sources.

## Screens

- `AssistantChatController` keeps a `ChatState` (loading, ready or failed) and an `AnswerState` (idle, in progress or failed). `isStreaming` comes from the state, so there is no separate flag.
- `AssistantListController` loads the list with `AsyncLoader` and creates conversations with `ActionRunner`, so a creation is not repeated while it runs.
- `ChatFailureKind` only distinguishes exhausted quota from a generic error. The screen translates that kind into text and does not know the error code.
- The message list follows the last line only if the user was already at the bottom, so reading earlier messages is never interrupted. On send, it jumps to the bottom.
- The answer is announced to screen readers only once, when it finishes. Fragments are not announced.

## Tests

`test/utils` has `ScriptedAssistantRepository`, which the test completes by hand: each history and each answer is a `Completer` or a `StreamController`, so the tests do not depend on real time. `pumpAssistantRoutes` mounts the manifest's real routes on a `TestScope`, and `assistantTestApp` mounts a single screen with the package's texts.

```sh
flutter analyze
flutter test
```
