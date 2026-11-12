# mf_assistant

Microfrontend del asistente de IA. Expone `assistantManifest` y las rutas bajo `/assistant`:

- `/assistant`: lista de conversaciones y botón "Nueva conversación".
- `/assistant/:conversationId`: chat con respuestas en streaming, botón para detener, fuentes (citas), confirmación de herramientas y errores con código y traceId.

Las pantallas se cargan de forma diferida (`ScreenLoader`). Las rutas reciben `scope` y crean el repositorio de cada identidad con `scope.get`, así una sesión nueva no ve datos de otra.

## Textos

Los textos propios viven en `lib/src/l10n/` (`app_es.arb` plantilla y `app_en.arb`) y se generan con `flutter gen-l10n` en `lib/src/l10n/generated/` (clase `AssistantLocalizations`). Las palabras compartidas salen de `AppLocalizations` del paquete `i18n`.

## Datos

`AssistantRepository` (`lib/src/data/`) define `ask` como `Stream<AssistantChunk>`: texto en chunks, un `ToolConfirmationRequest` opcional que pausa el stream hasta que el usuario confirma o rechaza, y un `AssistantFinalChunk` con citas y uso de tokens. Los errores llegan como `ApiErrorException` (paquete `contracts`) con el `ProblemDetails` de la API: código y traceId.

`FakeAssistantRepository` simula el SSE. Según la palabra del mensaje:

- `cuota`: `ApiErrorException` con código `BILLING.QUOTA.EXCEEDED`.
- `tarea`: pide confirmar la herramienta `crear_tarea`.
- Otro: respuesta en chunks con dos fuentes.

## Pruebas

```sh
flutter analyze
flutter test
```
