# 0018. Contrato de microfrontend

- Estado: Aceptada
- Fecha: 2026-11-12
- Actualizada: 2026-11-13 (servicios del shell, step-up y sesión real)
- Actualizada: 2026-11-14 (modo demo o vivo, identidad y menú declarados por el manifiesto)
- Actualizada: 2026-11-15 (patrones de pantalla y generador)

## Contexto

La revisión del 12 de noviembre encontró fugas entre identidades en el front: pantallas montadas que conservan los datos del usuario anterior, un ciclo de vida que sigue emitiendo el badge después de cerrar sesión, repositorios que nunca se cierran y SnackBars de un usuario visibles para el siguiente. También faltaban guardias en subrutas, MFA reciente para el backoffice y una regla de layout: el shell y la pantalla dibujaban dos barras superiores en compacto. Siete microfrontends van a migrar en paralelo, así que el contrato tiene que existir antes en `shell_core` y `ui`.

## Decisión

Cada microfrontend cumple este contrato. Las API anteriores (`routes:`, `lifecycle:`, `ShellContext.eventBus` y `AdaptiveScaffold.compactActions`) ya se eliminaron: los siete microfrontends migraron y `screens` y `lifecycleFactory` son la única forma de declararlos.

- **Pantallas:** el manifiesto declara `screens: [ScreenRoute.deferred(path, library: ..., build: (scope, params) => ..., routes: [...])]`. `library` es el import diferido del puente de pantallas y `build` recibe el `MicrofrontendScope` y `params`, que une query y path (gana el path). `params.require(nombre)` lee un parámetro que la ruta define. Una pantalla diferida envuelve su contenido en `DeferredLocalizations`, y sus diálogos y hojas se abren con `showLocalizedDialog` o `showLocalizedSheet`, porque un diálogo es una ruta hermana de la página y no hereda esas localizaciones. El repositorio de cada microfrontend se declara con `RepositoryBinding` y la pantalla lo pide con `scope.repository(...)`; en modo demo, los fakes usan `DemoBehavior` para la latencia, los fallos programados y el cierre. La localización, el tema y el acceso se leen en el `build` de la pantalla, dentro del chunk diferido.
- **Identidad:** `ShellRuntime.identityEpoch` sube con cada cambio de usuario o tenant. `ShellRouterFactory` envuelve cada página en un `KeyedSubtree` con ese valor, así una pantalla montada se reconstruye desde cero para la nueva identidad. Si la nueva identidad no puede usar el microfrontend, la página se vacía hasta que la redirección la retira.
- **Ciclo de vida:** `lifecycleFactory: () => MiLifecycle()` reemplazó a `lifecycle:`, que ya no existe. El runtime crea una instancia por activación, sin estado compartido entre runtimes. Los eventos salen con `ShellContext.emit` y se escuchan con `ShellContext.listen`; al rotar la identidad el contexto se cancela de forma síncrona y descarta lo que llegue tarde. `ShellContext` ya no expone `eventBus`. Si `initialize` falla, el runtime lo libera y reintenta con espera creciente (1 s, 2 s, 4 s... hasta 5 min).
- **Eventos de pantalla:** una pantalla emite con `MicrofrontendScope.emit`, que descarta el evento cuando el scope ya se cerró por un cambio de identidad. `ShellServices` no expone el bus: ni pantallas ni ciclos de vida lo tocan directamente.
- **Manifiesto:** declara su `id` (`MicrofrontendId('tasks')`, también el primer segmento de sus rutas), y el registro rechaza ids repetidos o que no sirvan como segmento de URL. Cada `MenuEntry` trae su etiqueta (`MenuLabel` con un texto por idioma, que el registro exige para cada idioma soportado), su icono y, si la tiene, su insignia (`MenuBadge<E>`, que el shell alimenta con el último evento `E`). Los eventos propios del microfrontend viven en su paquete, en carpetas que pueden ir en el bundle inicial. `deepLinks` traduce los enlaces de la app que empiezan por su segmento. Los paquetes compartidos no conocen ningún microfrontend.
- **Modo:** el shell decide una vez si es `ShellMode.demo` (sesiones de demostración y repositorios en memoria) o `ShellMode.live` (con `API_BASE_URL`). El manifiesto declara en `modes` los que sirve; un shell vivo no registra un microfrontend que solo tiene datos de demostración, así nunca muestra respuestas inventadas como si vinieran del servidor.
- **Servicios del shell:** `ShellServices` se construye por identidad y trae `session`, `mode`, `api`, `signOut()` y `requestStepUp()`. Cada repositorio elige su implementación con `mode`; `api` es el `ApiClient` con la sesión y lanza `StateError` en modo demo, y un shell vivo sin cliente falla al arrancar en lugar de caer a datos de demostración. Un repositorio real que no cubre una operación sin contrato lanza `UnsupportedError` y expone qué sabe servir, para que la pantalla no ofrezca lo demás.
- **Recursos:** los repositorios implementan `ScopedResource`. El scope llama a su `dispose()` al cerrarse, sin callback explícito.
- **Acceso:** `AccessRule.mfa(maxAge)` exige un segundo factor reciente (`UserSession.mfaVerifiedAt`). Si a una sesión autenticada solo le falta ese factor, el router la envía a `/step-up?from=...` (`ShellPaths.stepUp`). Las subrutas se protegen con `ScreenRoute(access: ...)` o con `redirect: accessRedirect(regla)` en un `GoRoute`. Las acciones se protegen con `AccessGate` o `context.can(regla)`. El menú muestra las entradas a las que la sesión llega tras el step-up.
- **Step-up de una acción:** antes de una acción sensible, el microfrontend llama a `scope.services.requestStepUp()` cuando `context.can(regla)` es falso. El shell abre su página `/step-up` con `StepUpRequests` de `shell_core` y responde true si el usuario verificó el factor, ya con `UserSession.mfaVerifiedAt` actualizado. Responde false si el usuario vuelve atrás, si la página sale de la pila sin respuesta (un `go` desde el menú, un enlace o una redirección, que go_router no completa) o si cambia la identidad. Ningún microfrontend tiene su propio diálogo de segundo factor.
- **Sesión real:** con `--dart-define=API_BASE_URL=...`, cada shell crea una `IdentityConnection` del paquete `auth` (`SessionManager`, `ApiAuthRepository` y un `ApiClient` con `accessToken: sessionManager.accessToken` y una `SessionRefreshPolicy` que refresca y reintenta ante los códigos de `IdentityConnection.refreshCodes`; en web, `CookieTokenStore` y cliente del navegador con credenciales). La conexión es dueña del transporte, que corta cada petición a los 30 s, y lo cierra al liberarse. La `UserSession` se llena con `UserSession.fromAccess` desde `GET /v1/me/access` (`SessionAccess`: permisos, roles de plataforma, features, flags y `mfaVerifiedAt`), se recarga tras cada refresh y vuelve a anónima cuando identity cierra la sesión. Sin la variable, los shells siguen con las sesiones de demostración y los fakes.
- **Layout:** cada pantalla es dueña de la única barra superior con `AppPage` (título, acciones, atrás). El shell usa `ShellChrome`, que no dibuja barra: en compacto publica sus acciones (cerrar sesión) y `AppPage` las agrega a su barra; en pantallas anchas van en el rail. `AdaptiveScaffold` ya no tiene `compactActions`.
- **Generador:** un microfrontend nuevo nace con `front/tools/new_microfrontend.dart`, que crea su paquete con este contrato. La decisión y sus alternativas están en el [ADR 0027](0027-patrones-de-pantalla-y-pruebas-del-front.md).
- **Estados y errores:** cada pantalla tiene un `XController` (`ChangeNotifier`) probado sin widgets. Su carga la compone un `AsyncLoader` de `ui`, que descarta la respuesta de una llamada vieja. Sus acciones pasan por `ActionRunner`, que devuelve `ActionSucceeded`, `ActionFailed` o `ActionSkipped`. La pantalla es un `StatelessWidget` que crea el controlador con `ControllerBuilder`, y muestra los estados con `AsyncValueView` (carga, error y datos). El resultado de una acción se muestra con `showActionResult`, que no hace nada si el contexto ya no está montado. Un error se describe con `ErrorPresenter` de `i18n`, que devuelve `ErrorDetails`: el texto sale del catálogo del código y nunca del servidor. Los shells limpian los SnackBars al cambiar de identidad.

## Consecuencias

### Positivas

- Ningún dato, evento, recurso o mensaje de un usuario llega al siguiente sin que cada microfrontend tenga que recordarlo.
- Las pantallas no dependen del `BuildContext` del router y se prueban montando `manifest.buildRoutes(...)`.
- Una sola barra superior en todas las anchuras.

### Costos

- Mientras un microfrontend no migre a `AppPage`, sus pantallas en compacto no muestran la acción de cerrar sesión del shell.
- Las rutas dentro de un `StatefulShellRoute` o con `pageBuilder` no se reconstruyen por identidad. Los manifiestos usan `screens`.
- `accessRedirect` fuera de `ShellRouterFactory` necesita un `ShellAccessScope` encima del router y falla si no lo encuentra.
- La interfaz oculta lo que el usuario no puede usar, pero la autoridad sigue siendo la API.
- En móvil el session token vive en memoria hasta que exista el adaptador de Keychain o Keystore, y sin `DeviceKeyPort` real el login no registra el dispositivo.
- Con API real solo aparecen los microfrontends que tienen adaptador real; hoy, la cuenta, y dentro de ella solo sesiones y dispositivos.

## Alternativas consideradas

- Recargar la app completa al cambiar de identidad: pierde la navegación y no resuelve los eventos tardíos del ciclo de vida.
- Que cada pantalla escuche la sesión y limpie su estado: depende de que siete equipos lo recuerden en cada pantalla.
- Mantener la barra del shell en compacto: duplica la barra superior y separa las acciones de la pantalla de las del shell.
