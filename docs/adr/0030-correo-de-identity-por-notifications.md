# 0030. Correo de identity por notifications

- Estado: Aceptada
- Fecha: 2026-11-23
- Relacionados: [ADR 0008](0008-sagas-orquestadas-bitacora-persistente.md), [ADR 0020](0020-terraform-por-stacks-y-runtime-por-servicio.md)

## Contexto

Identity envía nueve plantillas de correo transaccional con un adaptador en memoria o de consola. Notifications ya expone `notifications.messages.send.v1`, pero su contrato tenía cinco plantillas y espera datos con nombre de `TemplateParameter`, mientras identity entrega tokens y variables propias. Dos plantillas de identity (desbloqueo de cuenta y alerta de seguridad) no tenían quien las enviara: el desbloqueo es por tiempo y la alerta ya sale como evento, que notifications convierte en un aviso por todos los canales. La web todavía no tiene las pantallas a las que apuntaría un enlace de verificación, recuperación o invitación.

## Decisión

- `NotificationsIdentityMailer` (`IDENTITY_MAILER=notifications`) llama a `notifications.messages.send.v1` por la API interna, con un `messageId` nuevo por correo. Un código nunca pasa por el bus.
- El contrato de notifications suma `EmailTemplate.EmailAlreadyRegistered`, `EmailTemplate.MfaRecovery` y `TemplateParameter.AvailableAt`. Las plantillas de identity sin uso (`AccountUnlock` y `SecurityAlert`) se retiran.
- El token de identity viaja como `TemplateParameter.Code`. Cuando la web tenga sus pantallas, identity agregará `TemplateParameter.Link` y la plantilla mostrará la acción.
- Una línea de plantilla con un dato que no llegó se omite, así el saludo sin nombre no deja la llave a la vista.
- Identity manda el idioma del usuario (`locale`) cuando lo conoce; una invitación va a alguien sin cuenta y sale en el idioma por defecto de notifications.
- Un destinatario suprimido (`NOTIFICATIONS.EMAIL.RECIPIENT_SUPPRESSED`) es un correo descartado, no un fallo: identity lo registra y responde igual que con un envío, porque un error revelaría qué direcciones rebotaron o se quejaron. Solo un fallo o una respuesta incierta de notifications es `NotificationsUnavailableError`.
- El registro de correos (`email_messages`) vive en el catálogo y es global por `messageId`, aunque el diseño lo ubicaba en el shard del tenant: un correo de identity (registro, recuperación, código de MFA) puede no tener tenant, y la idempotencia por `messageId` tiene que valer sin saber en qué shard buscar. Igual que `notification_deliveries`, lleva `version`, `created_at` y `updated_at`, pero no `created_by` ni `updated_by`: lo escribe siempre el propio servicio y esas columnas tendrían un valor fijo.
- `SignedInternalHttp` recibe los servicios a los que llama y el servicio no arranca si `INTERNAL_API_BASE_URLS` no tiene la URL de alguno. La API interna de todos los servicios responde en el mismo path, así que esa URL la da el despliegue y no el ALB compartido.

## Consecuencias

Positivas:

- Un ambiente real envía los correos de identity con el ledger, la supresión y el proveedor de notifications.
- Falta de configuración se ve al arrancar y no en la primera llamada.

Costos:

- El usuario copia un código largo en vez de seguir un enlace hasta que la web tenga sus pantallas.
- Identity depende de que notifications responda para completar registro, recuperación e invitaciones.

## Alternativas consideradas

- Enviar los correos de identity por el bus: el código quedaría en el outbox y en las colas.
- Reutilizar plantillas existentes para los casos sin plantilla: el texto no correspondería a lo que pasó.
