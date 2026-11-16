# mf_assistant

Microfrontend del asistente de IA. Expone `assistantManifest` y las rutas bajo `/assistant`:

- `/assistant`: lista de conversaciones y botón "Nueva conversación".
- `/assistant/:conversationId`: chat con respuestas en streaming, botón para detener, fuentes (citas), confirmación de herramientas y errores con código y traceId.

Las pantallas se declaran con `ScreenRoute.deferred` y `AssistantScreens`, que se cargan de forma diferida. Cada pantalla recibe su repositorio con `scope.repository(AssistantData.repository)`, así cada identidad tiene el suyo y el scope lo libera al cerrarse, lo que corta las respuestas en curso.

## Textos

Los textos propios viven en `lib/src/l10n/` (`app_es.arb` plantilla y `app_en.arb`) y se generan con `flutter gen-l10n` en `lib/src/l10n/generated/` (clase `AssistantLocalizations`). Las palabras compartidas salen de `AppLocalizations` del paquete `i18n`.

## Datos

`AssistantRepository` (`lib/src/data/`) define `ask` como `Stream<AssistantChunk>`: texto en chunks, un `ToolConfirmationRequest` opcional que pausa el stream hasta que el usuario confirma o rechaza, y un `AssistantFinalChunk` con citas y uso de tokens. Los errores llegan como `ApiErrorException` (paquete `contracts`) con el `ProblemDetails` de la API: código y traceId.

`AssistantData.repository` es un `RepositoryBinding.demoOnly` que entrega un `FakeAssistantRepository` con un `DemoBehavior` de latencia de 300 ms. El fake simula el SSE y su `DemoBehavior` permite programar latencia y fallos por `AssistantOperation` (listar, crear, cargar historia y preguntar). `chunkDelay` solo marca el ritmo de los fragmentos de una respuesta.

Según la palabra del mensaje, el fake responde así:

- `cuota`: `ApiErrorException` con código `BILLING.QUOTA.EXCEEDED`.
- `tarea`: pide confirmar la herramienta `crear_tarea`.
- Otro: respuesta en chunks con dos fuentes.

## Pantallas

- `AssistantChatController` mantiene un `ChatState` (cargando, listo o fallido) y un `AnswerState` (inactiva, en curso o fallida). `isStreaming` sale del estado, así no hay una bandera aparte.
- `AssistantListController` carga la lista con `AsyncLoader` y crea conversaciones con `ActionRunner`, de modo que una creación no se repite mientras corre.
- `ChatFailureKind` solo distingue cuota agotada de error genérico. La pantalla traduce ese tipo a texto y no conoce el código del error.
- La lista de mensajes sigue la última línea solo si el usuario ya estaba al final, así leer mensajes anteriores nunca se interrumpe. Al enviar, salta al final.
- La respuesta se anuncia a lectores de pantalla una sola vez, al terminar. Los fragmentos no se anuncian.

## Pruebas

`test/utils` tiene `ScriptedAssistantRepository`, que el test completa a mano: cada historia y cada respuesta es un `Completer` o un `StreamController`, así las pruebas no dependen del tiempo real. `pumpAssistantRoutes` monta las rutas reales del manifiesto sobre un `TestScope`, y `assistantTestApp` monta una pantalla suelta con los textos del paquete.

```sh
flutter analyze
flutter test
```
