# Módulo alb

Balanceador de aplicación internet-facing para los servicios Fargate de larga conexión, como el gateway de tiempo real (Socket.IO y SSE).

## Qué crea

- ALB con listener HTTPS (certificado ACM, política TLS 1.3/1.2) y listener HTTP que redirige a HTTPS con 301.
- Respuesta 404 por defecto, o un target group por defecto con `default_target_group_key`.
- Security group con entrada solo por 80 y 443 desde los CIDR o prefix lists indicados. No tiene salida: cada servicio abre la suya (`service-fargate` agrega la regla hacia su security group).
- Bucket S3 de access logs privado, con TLS obligatorio, versión SSE-S3 (ELB no admite KMS en access logs) y expiración.
- Target groups opcionales sin sesiones pegajosas (`stickiness.enabled = false`).

## Entradas principales

| Variable                                             | Descripción                                                                  |
| ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| `name_prefix`, `vpc_id`, `subnet_ids`                | Nombre, VPC y subredes públicas (mínimo dos).                                |
| `certificate_arn`                                    | Certificado ACM del listener HTTPS.                                          |
| `idle_timeout_seconds`                               | 3600 por defecto, para conexiones largas. Máximo 4000.                       |
| `ingress_cidr_blocks`, `ingress_prefix_list_ids`     | Quién llega al ALB. Con CloudFront delante, usa su prefix list de origen.    |
| `deletion_protection`                                | Activa por defecto.                                                          |
| `target_groups`, `default_target_group_key`          | Target groups compartidos opcionales.                                        |

## Salidas

`arn`, `arn_suffix`, `dns_name`, `zone_id`, `security_group_id`, `https_listener_arn`, `http_listener_arn`, `target_group_arns`, `access_logs_bucket`.

## Notas

- WebSocket y SSE necesitan un `idle_timeout_seconds` mayor que el intervalo de ping de la aplicación.
- Socket.IO usa solo WebSocket, por eso no hay stickiness.
