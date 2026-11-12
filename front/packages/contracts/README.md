# contracts

Contratos de API compartidos por el front: códigos de error de la plataforma, documentos de problema (RFC 9457) y la excepción `ApiErrorException`.

- `PlatformErrorCode`: enum con los mismos códigos que `libs/contracts/platform`. `fromCode` devuelve `null` si el código no se conoce.
- `ProblemDetails` y `FieldError`: modelos inmutables con `fromJson` y `toJson`.
- `ApiErrorException`: envuelve un `ProblemDetails`; `platformCode` devuelve el código conocido.

El test `platform_error_code_sync_test.dart` compara el enum con el TypeScript y comprueba que cada código tenga mensaje en `i18n`. Hasta que exista el generador, el enum se escribe a mano y ese test lo protege.
