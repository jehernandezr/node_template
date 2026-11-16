# contracts

Dart de los contratos del backend, para el front. Paquete de Dart puro.

- `lib/src/core/`: núcleo escrito a mano. `RouteDescriptor` y `encodeQuery`, `ProblemDetails` y `FieldError` (RFC 9457), `ApiErrorException`, `ContractViolationException`, validación e igualdad.
- `lib/src/<servicio>/`: código generado por `front/tools/contracts_gen` desde `backend/libs/contracts/*/export/contract.json` (ADR 0017): enums, constantes, tipos, validadores, rutas y mensajes. No se edita a mano; `dart run contracts_gen --check` falla si quedó desactualizado.

`test/platform_error_code_sync_test.dart` comprueba que cada código público tenga mensaje en `i18n`.
