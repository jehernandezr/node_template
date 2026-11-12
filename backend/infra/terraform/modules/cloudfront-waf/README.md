# Módulo cloudfront-waf

CloudFront delante de la web Flutter (S3 con OAC) y de la API (ALB o API Gateway), con un WAFv2 compartido.

## Qué crea

- Bucket S3 privado para el build de Flutter web (KMS, versionado, TLS obligatorio), accesible solo por la distribución mediante Origin Access Control.
- Distribución de la web con fallback de SPA: 403 y 404 devuelven `index.html` con 200. Cache optimizado y compresión.
- Distribución de la API (opcional, con `api_origin_domain_name`): sin caché, todos los métodos, reenvía cabeceras, cookies y query strings, y los encabezados `CloudFront-Viewer-*` de geolocalización que usa el contexto de MFA.
- Política de cabeceras de seguridad: HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` y CSP opcional.
- WAFv2 de ámbito CloudFront con los grupos administrados Common, KnownBadInputs, AmazonIpReputation y SQLi, un límite de tasa por IP y otro más estricto sobre `/auth/` contra relleno de credenciales.
- Logs de WAF en un log group `aws-waf-logs-*` con KMS en us-east-1, con `authorization` y `cookie` redactados.

## Providers

CloudFront y WAF de ámbito CloudFront solo existen en us-east-1. El módulo declara el alias `aws.us_east_1`, que la raíz debe pasar:

```hcl
providers = {
  aws           = aws
  aws.us_east_1 = aws.us_east_1
}
```

El certificado ACM de los dominios debe estar también en us-east-1.

## Entradas principales

| Variable                         | Descripción                                                              |
| -------------------------------- | ------------------------------------------------------------------------ |
| `acm_certificate_arn`            | Certificado en us-east-1 que cubre todos los alias.                      |
| `web_aliases`, `api_aliases`     | Dominios de cada distribución.                                           |
| `api_origin_domain_name`         | Dominio del origen. Debe coincidir con su certificado TLS. Null omite la API. |
| `api_origin_verify_header_value` | Secreto en `X-Origin-Verify` para que el ALB rechace lo que no viene de CloudFront. |
| `waf_block_mode`                 | `false` solo cuenta: úsalo para afinar reglas antes de bloquear.         |
| `waf_rate_limit`, `waf_auth_rate_limit` | Peticiones por IP en 5 minutos.                                   |
| `content_security_policy`        | CSP a medida de la web Flutter.                                          |

## Salidas

`web_bucket_name`, `web_bucket_arn`, `web_kms_key_arn`, `web_distribution_id`, `web_distribution_arn`, `web_domain_name`, `api_distribution_id`, `api_distribution_arn`, `api_domain_name`, `cloudfront_hosted_zone_id`, `web_acl_arn`, `waf_log_group_name`.

## Notas

- El módulo no crea registros DNS. La raíz apunta los alias a `web_domain_name` y `api_domain_name` con `cloudfront_hosted_zone_id`.
- Socket.IO y SSE entran directo al ALB de tiempo real, no por CloudFront, por los tiempos de lectura del origen.
- Con `api_origin_verify_header_value`, la raíz agrega al ALB una regla que exija ese encabezado.
- El pipeline que publica la web necesita `s3:PutObject` en el bucket, `kms:GenerateDataKey` en `web_kms_key_arn` y `cloudfront:CreateInvalidation`.
