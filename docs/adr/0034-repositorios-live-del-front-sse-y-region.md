# 0034. Repositorios live del front, SSE y región en el cliente

- Estado: Aceptada
- Fecha: 2026-11-24
- Relacionados: [ADR 0011](0011-tiempo-real-socketio-sse.md), [ADR 0018](0018-contrato-de-microfrontend.md), [ADR 0027](0027-patrones-de-pantalla-y-pruebas-del-front.md), [ADR 0028](0028-tiempo-real-sobre-un-stream-por-usuario.md), [ADR 0032](0032-traslado-de-tenants-y-regiones.md)

## Contexto

Con los contratos de tasks, notifications, reports y billing publicados, sus microfrontends dejan de ser solo demo. Al conectarlos aparecieron decisiones que el diseño no fijaba: cómo conviven los tipos de la pantalla con los generados, cómo lee el front el stream SSE que no está en el contrato, qué hace el cliente cuando el tenant vive en otra región, cómo se descarga un reporte sin dependencias nuevas y cómo prueban todos esto sin backend. El flujo de punta a punta del backend que recorre estos servicios juntos tiene su propio [ADR 0035](0035-flujo-de-punta-a-punta-de-la-plataforma.md).

## Decisión

- **Un binding con dos adaptadores.** Cada microfrontend declara `RepositoryBinding(demo:, live:)`. El adaptador live (`ApiTasksRepository`, `ApiNotificationsRepository`, `ApiBillingRepository`, `ApiReportsRepository`) usa `ApiClient` con las rutas generadas, así cada petición se valida contra el contrato antes de salir. Los manifiestos dejan de declarar `modes: {demo}`. El fake se queda para el modo demo y las pruebas.
- **Tipos.** Los enums que el contrato ya define se reexportan desde el `shared/enums` del microfrontend (`TaskStatus`, `NotificationType`, `NotificationChannel`, `Currency`, `UsageMetric`, `InvoiceStatus` y los demás de billing); las reglas propias van en extensiones (`NotificationTypeRules.isMandatory`). Los tipos de pantalla que agregan algo (un `ClockTime`, un total calculado, un resumen de factura) se quedan y un mapper por servicio los arma desde los generados. Reports usa los tipos generados directamente porque la pantalla no les agrega nada.
- **Errores con significado en la pantalla.** El adaptador traduce a una excepción propia solo el código que la pantalla trata distinto: `TASKS.TASK.NOT_FOUND` a `TaskNotFoundException`, `REPORTS.RUN.NOT_FOUND` a `ReportRunNotFoundException` y `BILLING.INVOICE.NOT_FOUND` a `null` en `invoice(id)`. El resto llega como `ApiErrorException` y se muestra con `ErrorPresenter`. `ChangePlanController.isPlanRefused` marca `BILLING.QUOTA.EXCEEDED` y `BILLING.PLAN.USAGE_EXCEEDS_LIMIT` para que la hoja muestre el texto de ese código en vez del genérico.
- **SSE.** `SseNotificationsStream` lee `GET /v1/notifications/stream` (fuera del contrato, como `/health`) con `package:http`, el token y la base actuales de `ApiClient`. Lee las tramas con `ServerSentEventReader`, valida cada una contra su esquema generado y descarta las que no lo cumplen. Al cortarse emite `StreamDisconnected` y reconecta con `Last-Event-ID` y una espera que se duplica hasta un minuto (o la que mande `retry`); recuerda los ids de las últimas 256 tramas y descarta las que el servidor reenvía, así una reconexión no pierde ni repite avisos. Una trama `session-closed` termina las reconexiones. `ApiNotificationsRepository` arma `live()` y `watchUnreadCount()` sobre ese stream: el conteo arranca con la API, sigue las tramas `unread-count` y vuelve a leer la API en cada intento de reconexión y en cada marca de leído; un conteo que no se puede leer se salta sin error, porque el ciclo de vida que lo escucha no tiene a quién mostrárselo.
- **Región.** Ante un 421 con `PLATFORM.SHARDING.WRONG_REGION`, `ApiClient` repite la petición una vez contra `details.apiBaseUrl` y se queda con esa base para las siguientes, también para el SSE. Solo sigue una URL absoluta `https`, o `http` cuando la base actual ya es `http` (local): el token nunca viaja a un esquema más débil que el de origen. Un segundo 421 llega a quien llama. `ProblemDetails` del front lleva `details`.
- **Descarga de reportes.** `ReportFileSaver` es un puerto con dos adaptadores elegidos por importación condicional: en el navegador descarga el archivo con su nombre (`package:web`, que ya llegaba por `package:http`), y fuera de él copia el contenido al portapapeles, porque la app móvil no tiene una carpeta propia sin sumar dependencias. La pantalla dice cuál de los dos pasó.
- **Sondeo.** `RunPolling` vuelve a leer una ejecución, o la lista, mientras alguna está en cola o en curso, con un `Timer` que se cancela en `dispose`; las lecturas siguientes conservan los datos en pantalla.
- **Pruebas sin backend.** `ScriptedTransport` de `test_utils` responde por orden o por ruta y registra cada petición; `ScriptedApi.liveScope` arma un scope live sobre él. Los escenarios compartidos de las apps suman uno live: tras el login, tasks lee su API con el token de la sesión y sigue al tenant a su región. `ShellHost.whenDisposed` deja a las pruebas esperar a que la app termine de soltar los recursos de cada identidad, como la conexión SSE, antes de revisar temporizadores pendientes.

## Consecuencias

### Positivas

- Las pantallas no cambian entre demo y live; solo cambia el adaptador que entrega el binding.
- Un cambio de enum en el contrato rompe la compilación del microfrontend que lo usa.
- Un aviso no se pierde ni se repite al reconectar, y un tenant trasladado de región sigue funcionando sin volver a iniciar sesión.

### Costos

- Cada adaptador live mantiene un mapper con los tipos de pantalla que agregan algo.
- En la app móvil la descarga de un reporte es una copia al portapapeles hasta que se acepte una dependencia para guardar archivos.
- Mientras el stream está caído, el conteo de no leídos se lee en cada intento de reconexión, con la misma espera creciente.

## Alternativas descartadas

- Reemplazar todos los tipos de pantalla por los generados: perdía el `ClockTime` de las preferencias y el total de una factura calculado de sus líneas.
- Agregar el stream al contrato: no es una petición con respuesta y el generador no tiene cómo describirlo.
- Seguir cualquier `apiBaseUrl`: un servidor comprometido podría mandar el token a otro esquema.
