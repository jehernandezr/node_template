# 0018. Contrato de microfrontend

- Estado: Aceptada
- Fecha: 2026-11-12

## Contexto

La auditoría del 12 de noviembre encontró fugas entre identidades en el front: pantallas montadas que conservan los datos del usuario anterior, un ciclo de vida que sigue emitiendo el badge después de cerrar sesión, repositorios que nunca se cierran y SnackBars de un usuario visibles para el siguiente. También faltaban guardias en subrutas, MFA reciente para el backoffice y una regla de layout: el shell y la pantalla dibujaban dos barras superiores en compacto. Siete microfrontends van a migrar en paralelo, así que el contrato tiene que existir antes en `shell_core` y `ui`.

## Decisión

Cada microfrontend cumple este contrato. Las API anteriores siguen funcionando, marcadas `@Deprecated`, hasta que su microfrontend migre.

- **Pantallas:** el manifiesto declara `screens: [ScreenRoute(...)]`. Cada `ScreenRoute` tiene `path`, `loadLibrary` del import diferido y un builder `(MicrofrontendScope scope, {Map<String, String> params})` sin `BuildContext`. `params` une query y path (gana el path). La localización, el tema y el acceso se leen en el `build` de la pantalla, dentro del chunk diferido. Reemplaza a `routes: (load, scope) => [GoRoute(...)]`.
- **Identidad:** `ShellRuntime.identityEpoch` sube con cada cambio de usuario o tenant. `buildShellRouter` envuelve cada página en un `KeyedSubtree` con ese valor, así una pantalla montada se reconstruye desde cero para la nueva identidad. Si la nueva identidad no puede usar el microfrontend, la página se vacía hasta que la redirección la retira.
- **Ciclo de vida:** `lifecycleFactory: () => MiLifecycle()` reemplaza a `lifecycle:`. El runtime crea una instancia por activación, sin estado compartido entre runtimes. Los eventos salen con `ShellContext.emit` y se escuchan con `ShellContext.listen`; al rotar la identidad el contexto se cancela de forma síncrona y descarta lo que llegue tarde. `ShellContext.eventBus` queda obsoleto. Si `initialize` falla, el runtime lo libera y reintenta con espera creciente (1 s, 2 s, 4 s... hasta 5 min).
- **Recursos:** los repositorios implementan `ScopedResource`. El scope llama a su `dispose()` al cerrarse, sin callback explícito.
- **Acceso:** `AccessRule.mfa(maxAge)` exige un segundo factor reciente (`UserSession.mfaVerifiedAt`). Si a una sesión autenticada solo le falta ese factor, el router la envía a `/step-up?from=...` (opción `stepUpPath`). Las subrutas se protegen con `ScreenRoute(access: ...)` o con `redirect: accessRedirect(regla)` en un `GoRoute`. Las acciones se protegen con `AccessGate` o `context.can(regla)`. El menú muestra las entradas a las que la sesión llega tras el step-up.
- **Layout:** cada pantalla es dueña de la única barra superior con `AppPage` (título, acciones, atrás). El shell usa `ShellChrome`, que no dibuja barra: en compacto publica sus acciones (cerrar sesión) y `AppPage` las agrega a su barra; en pantallas anchas van en el rail. `AdaptiveScaffold.compactActions` queda obsoleto.
- **Estados y errores:** `AsyncValueView` muestra carga, error (`ErrorView.fromException`) y datos. Los errores de una acción se muestran con `showActionError(context, error, message: ...)`, que no hace nada si el contexto ya no está montado. Los shells limpian los SnackBars al cambiar de identidad.

## Consecuencias

### Positivas

- Ningún dato, evento, recurso o mensaje de un usuario llega al siguiente sin que cada microfrontend tenga que recordarlo.
- Las pantallas no dependen del `BuildContext` del router y se prueban montando `manifest.buildRoutes(...)`.
- Una sola barra superior en todas las anchuras.

### Costos

- Mientras un microfrontend no migre a `AppPage`, sus pantallas en compacto no muestran la acción de cerrar sesión del shell.
- Las rutas dentro de un `StatefulShellRoute` o con `pageBuilder` no se reconstruyen por identidad. Los manifiestos usan `screens`.
- `accessRedirect` fuera de `buildShellRouter` necesita un `ShellAccessScope` encima del router y falla si no lo encuentra.
- La interfaz oculta lo que el usuario no puede usar, pero la autoridad sigue siendo la API.

## Alternativas consideradas

- Recargar la app completa al cambiar de identidad: pierde la navegación y no resuelve los eventos tardíos del ciclo de vida.
- Que cada pantalla escuche la sesión y limpie su estado: depende de que siete equipos lo recuerden en cada pantalla.
- Mantener la barra del shell en compacto: duplica la barra superior y separa las acciones de la pantalla de las del shell.
