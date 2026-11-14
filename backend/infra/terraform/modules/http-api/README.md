# Módulo http-api

API Gateway HTTP compartida por todos los servicios. CloudFront con WAF va delante (stack edge) y cada servicio agrega sus rutas desde su stack con el módulo `api-routes`.

## Qué crea

- API HTTP con stage `$default`, despliegue automático, límites de tasa y access logs en JSON (log group con retención y CMK).
- Verificación de origen: un secreto en Secrets Manager con el valor de `X-Origin-Verify` (contraseña efímera escrita con un atributo de solo escritura, fuera del estado) y un autorizador Lambda REQUEST con caché por valor. Sin el encabezado, API Gateway responde 401 sin invocar la función.
- Opcional (`vpc_link`): VPC link con su security group, para las APIs que corren en Fargate detrás de un ALB interno. La salida hacia el ALB la declara quien lo conoce (stack platform).

## Salidas

`api_id`, `execution_arn`, `endpoint_host` (origen de CloudFront), `vpc_link_id`, `vpc_link_security_group_id`, `authorizer_id`, `origin_verify_secret_arn`, `kms_key_arn`.

## Notas

- Para rotar el secreto de origen sube `origin_verify_secret_version`, aplica platform y luego edge. Durante la ventana entre los dos apply la API rechaza el tráfico de CloudFront.
- El tiempo máximo de una integración de API Gateway HTTP es 30 segundos. Las conexiones largas (Socket.IO y SSE) van por el ALB de tiempo real.
