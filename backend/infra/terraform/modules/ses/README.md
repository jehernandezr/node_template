# Módulo ses

Identidad de dominio de SES con DKIM y configuration sets que publican los eventos de correo en un tópico SNS cifrado.

## Qué crea

- Identidad de dominio con DKIM (RSA 2048) y MAIL FROM personalizado (`mail.<domain>`), para alinear SPF con DMARC.
- Registros DNS en Route 53 (DKIM, MX y SPF del MAIL FROM, DMARC) si pasas `route53_zone_id`. Si no, la salida `dns_records` lista lo que debes publicar.
- Dos configuration sets con TLS obligatorio, métricas de reputación y lista de supresión por rebotes y quejas:
  - `<prefix>-tracked`: eventos de entrega, rebote, queja, apertura y clic. Para correo masivo y de producto.
  - `<prefix>-security`: sin seguimiento de aperturas ni clics. Para correos de seguridad (códigos, alertas de inicio de sesión).
- Tópico SNS cifrado con KMS que recibe los eventos de ambos sets. La política solo permite publicar a SES desde la cuenta.

## Entradas principales

| Variable                   | Descripción                                         |
| -------------------------- | --------------------------------------------------- |
| `name_prefix`, `domain`    | Prefijo y dominio remitente.                        |
| `route53_zone_id`          | Zona para crear los registros DNS. Opcional.        |
| `dmarc_policy`             | `none`, `quarantine` o `reject`. Empieza en `none`. |
| `dmarc_report_email`       | Destino de los informes `rua`.                      |
| `tracked_event_types`      | Eventos del set con seguimiento.                    |
| `tracking_redirect_domain` | Dominio propio para enlaces de seguimiento.         |

## Salidas

`identity_arn`, `configuration_set_names`, `events_topic_arn`, `events_kms_key_arn`, `dkim_tokens`, `dns_records`, `send_policy_json`.

## Notas

- Una cuenta nueva de SES está en sandbox. Pide el acceso a producción en la consola.
- Quien se suscriba al tópico (la cola de `notifications`) necesita `kms:Decrypt` sobre `events_kms_key_arn` y una política de cola que acepte a SNS.
- El SPF del dominio raíz no se toca: el módulo solo publica el del subdominio MAIL FROM.
