# Módulo api-routes

Rutas de un servicio en la API HTTP compartida (módulo `http-api`). El runtime de la API solo cambia el destino de la integración.

## Qué crea

- Una integración: `AWS_PROXY` (payload 2.0) hacia la Lambda del servicio, o `HTTP_PROXY` por el VPC link hacia el listener del ALB interno.
- Por cada prefijo, las rutas `ANY <prefijo>` y `ANY <prefijo>/{proxy+}`, con el autorizador de origen si se indica.
- El permiso para que API Gateway invoque la Lambda.

## Entradas principales

| Variable                                               | Descripción                                                                               |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `name`, `api_id`, `api_execution_arn`, `authorizer_id` | Servicio y API compartida.                                                                |
| `route_prefixes`                                       | Prefijos del servicio, por ejemplo `["/tasks"]`.                                          |
| `target`                                               | `type = "lambda"` con nombre e invoke ARN, o `type = "vpc_link"` con VPC link y listener. |
| `timeout_milliseconds`                                 | Hasta 30000.                                                                              |

## Salidas

`integration_id`, `route_keys`.
