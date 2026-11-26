---
name: front-navigation
description: 'Navigation with go_router: manifest routes, parameters, guards and return after login. Use it when adding a route or navigating from a screen.'
paths:
  - 'front/packages/shell_core/**'
  - 'front/packages/shell_host/**'
  - 'front/microfrontends/*/lib/*.dart'
  - 'front/microfrontends/**/constants/**'
---

# Navigation

The shell (`shell_core`) already uses `go_router`. Microfrontends do not create a `GoRouter` or use `Navigator` directly: they declare `ScreenRoute.deferred` in their manifest (ADR 0018), and `ShellRouterFactory` from `shell_core` builds the router. `ShellNavigator` from the same package resolves the home page and the destination after logout.

## Rules

- A microfrontend's routes hang from its id (`/tasks`, `/tasks/:id`, `/tasks/:id/edit`). They are built in a constants class of the microfrontend (`TasksPaths`), and screens never write a path by hand. <!-- id: front-navigation.1 -->
- `context.go(TasksPaths.detail(id))` to change destination. `context.push` only when the screen expects a result (`await context.push<bool>(...)`) or is a temporary step over the current one. `context.pop` to go back. <!-- id: front-navigation.2 -->
- Data travels in the path (`:id`) or the query (`?status=done`). Never in `extra`: it is lost on a web reload, in a deep link and when the app is restored. `ScreenRoute` delivers both merged in `params`, and the path wins. <!-- id: front-navigation.3 -->
- A segment that names a page (`new`, `edit`) must not be mistaken for an id: it is declared in the paths class, as `TasksPaths` does. <!-- id: front-navigation.4 -->
- Segments use lowercase and hyphens (`/audit-log`), not camelCase or underscores. <!-- id: front-navigation.5 -->
- Subroutes are nested as children of their route so back works: `/tasks` has `:id`, and `:id` has `edit`. <!-- id: front-navigation.6 -->
- An app link enters through the manifest's `deepLinks`, which translates it to one of its own routes. Anything from outside (query, path) is untrusted data: it is validated and, if invalid, the error screen is shown instead of throwing. <!-- id: front-navigation.7 -->
- Access is declared, not coded in the screen: `ScreenRoute(access: ...)`, `redirect: accessRedirect(rule)` for a subroute, `AccessGate` or `context.can(rule)` for an action. A sensitive action calls `scope.services.requestStepUp()`. <!-- id: front-navigation.8 -->
- After login the user returns to the origin with `?from=`, validated by `return_location` in `shell_host` so it never redirects to an external site. <!-- id: front-navigation.9 -->
- After an `await`, before navigating, check `mounted` (see `front-code`). <!-- id: front-navigation.10 -->
- Transitions respect `disableAnimations` (see `front-accessibility`). <!-- id: front-navigation.11 -->

## Example

The controller returns the action result and the screen decides the navigation (see `front-code`). Illustrative example:

Example in `references/examples.md`, section "Example".

## Tests

A microfrontend's routes are tested by mounting its manifest in a test `GoRouter` on `TestApp.wrapRouter` from `test_utils`, as in `TasksTestApp` (`test/utils/tasks_app.dart`). The final location is read from `router.routeInformationProvider.value.uri`. Redirects and guards are tested with the session from `SessionBuilder`, with or without permissions.

## Rejected from the public guides

Typed routes with `@TypedGoRoute` and `go_router_builder` require a code generator. The `*Paths` constants give the same result without a new dependency.

## With pstack

Method in `pstack-in-node-template`. The pstack skills that apply here: `principle-test-behavior-not-implementation`, `principle-model-the-domain`, `blast-radius`. Every screen with a route parameter has a test that navigates from one id to another and checks that the screen shows the new one.
