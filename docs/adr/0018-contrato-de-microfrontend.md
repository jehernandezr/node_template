# 0018. Contrato de microfrontend

- Estado: Aceptada
- Fecha: 2026-11-12
- Actualizada: 2026-11-13 (servicios del shell, step-up y sesión real)

## Contexto

La auditoría del 12 de noviembre encontró fugas entre identidades en el front: pantallas montadas que conservan los datos del usuario anterior, un ciclo de vida que sigue emitiendo el badge después de cerrar sesión, repositorios que nunca se cierran y SnackBars de un usuario visibles para el siguiente. También faltaban guardias en subrutas, MFA reciente para el backoffice y una regla de layout: el shell y la pantalla dibujaban dos barras superiores en compacto. Siete microfrontends van a migrar en paralelo, así que el contrato tiene que existir antes en `shell_core` y `ui`.

## Decisión

Cada microfrontend cumple este contrato. Las API anteriores (`routes:`, `lifecycle:`, `ShellContext.eventBus` y `AdaptiveScaffold.compactActions`) ya se eliminaron: los siete microfrontends migraron y `screens` y `lifecycleFactory` son la única forma de declararlos.

- **Pantallas:** el manifiesto declara `screens: [ScreenRoute(...)]`. Cada `ScreenRoute` tiene `path`, `loadLibrary` del import diferido y un builder `(MicrofrontendScope scope, {Map<String, String> params})` sin `BuildContext`. `params` une query y path (gana el path). La localización, el tema y el acceso se leen en el `build` de la pantalla, dentro del chunk diferido. Reemplazó a `routes: (load, scope) => [GoRoute(...)]`, que ya no existe. `buildRoutes` devuelve solo `GoRoute` construidos desde `screens`.
- **Identidad:** `ShellRuntime.identityEpoch` sube con cada cambio de usuario o tenant. `buildShellRouter` envuelve cada página en un `KeyedSubtree` con ese valor, así una pantalla montada se reconstruye desde cero para la nueva identidad. Si la nueva identidad no puede usar el microfrontend, la página se vacía hasta que la redirección la retira.
- **Ciclo de vida:** `lifecycleFactory: () => MiLifecycle()` reemplazó a `lifecycle:`, que ya no existe. El runtime crea una instancia por activación, sin estado compartido entre runtimes. Los eventos salen con `ShellContext.emit` y se escuchan con `ShellContext.listen`; al rotar la identidad el contexto se cancela de forma síncrona y descarta lo que llegue tarde. `ShellContext` ya no expone `eventBus`. Si `initialize` falla, el runtime lo libera y reintenta con espera creciente (1 s, 2 s, 4 s... hasta 5 min).
- **Eventos de pantalla:** una pantalla emite con `MicrofrontendScope.emit`, que descarta el evento cuando el scope ya se cerró por un cambio de identidad. `ShellServices` no expone el bus: ni pantallas ni ciclos de vida lo tocan directamente.
- **Servicios del shell:** `ShellServices` se construye por identidad y trae `session`, `signOut()`, `requestStepUp()` y `extra<T>()`. Con una API real, el shell registra en `extra<ApiClient>()` el cliente con la sesión, y cada repositorio elige entre la implementación real y el fake según esté o no.
- **Recursos:** los repositorios implementan `ScopedResource`. El scope llama a su `dispose()` al cerrarse, sin callback explícito.
- **Acceso:** `AccessRule.mfa(maxAge)` exige un segundo factor reciente (`UserSession.mfaVerifiedAt`). Si a una sesión autenticada solo le falta ese factor, el router la envía a `/step-up?from=...` (opción `stepUpPath`). Las subrutas se protegen con `ScreenRoute(access: ...)` o con `redirect: accessRedirect(regla)` en un `GoRoute`. Las acciones se protegen con `AccessGate` o `context.can(regla)`. El menú muestra las entradas a las que la sesión llega tras el step-up.
- **Step-up de una acción:** antes de una acción sensible, el microfrontend llama a `scope.services.requestStepUp()` cuando `context.can(regla)` es falso. El shell abre su página `/step-up` con `StepUpRequests` de `shell_core` y responde true si el usuario verificó el factor, ya con `UserSession.mfaVerifiedAt` actualizado. Responde false si el usuario vuelve atrás, si la página sale de la pila sin respuesta (un `go` desde el menú, un enlace o una redirección, que go_router no completa) o si cambia la identidad. Ningún microfrontend tiene su propio diálogo de segundo factor.
- **Sesión real:** con `--dart-define=API_BASE_URL=...`, cada shell crea una `IdentityConnection` del paquete `auth` (`SessionManager`, `ApiAuthRepository` y un `ApiClient` con `accessToken: sessionManager.accessToken` y `onStalePermissions: sessionManager.refresh`; en web, `CookieTokenStore` y cliente del navegador con credenciales). La `UserSession` se llena con `UserSession.fromAccess` desde `GET /v1/me/access` (`SessionAccess`: permisos, roles de plataforma, features, flags y `mfaVerifiedAt`), se recarga tras cada refresh y vuelve a anónima cuando identity cierra la sesión. Sin la variable, los shells siguen con las sesiones de demostración y los fakes.
- **Layout:** cada pantalla es dueña de la única barra superior con `AppPage` (título, acciones, atrás). El shell usa `ShellChrome`, que no dibuja barra: en compacto publica sus acciones (cerrar sesión) y `AppPage` las agrega a su barra; en pantallas anchas van en el rail. `AdaptiveScaffold` ya no tiene `compactActions`.
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
- El contrato `identity` aún no publica refresh, cierre de sesión ni step-up. Con API real, la sesión dura lo que el access token, el cierre es solo local y la página `/step-up` sigue marcando el factor sin desafío.
- En móvil el session token vive en memoria hasta que exista el adaptador de Keychain o Keystore, y sin `DeviceKeyPort` real el login no registra el dispositivo.

## Alternativas consideradas

- Recargar la app completa al cambiar de identidad: pierde la navegación y no resuelve los eventos tardíos del ciclo de vida.
- Que cada pantalla escuche la sesión y limpie su estado: depende de que siete equipos lo recuerden en cada pantalla.
- Mantener la barra del shell en compacto: duplica la barra superior y separa las acciones de la pantalla de las del shell.
