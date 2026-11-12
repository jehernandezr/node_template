variable "name_prefix" {
  description = "Prefijo para los nombres de las distribuciones, el bucket web y el WAF."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix debe usar minúsculas, números y guiones, y tener entre 3 y 22 caracteres."
  }
}

variable "acm_certificate_arn" {
  description = "ARN del certificado ACM en us-east-1 que cubre web_aliases y api_aliases."
  type        = string

  validation {
    condition     = can(regex("^arn:[^:]+:acm:us-east-1:", var.acm_certificate_arn))
    error_message = "El certificado de CloudFront debe estar en us-east-1."
  }
}

variable "web_aliases" {
  description = "Dominios de la web Flutter, por ejemplo app.example.com."
  type        = list(string)
  default     = []
}

variable "web_default_root_object" {
  description = "Objeto que se sirve en la raíz."
  type        = string
  default     = "index.html"
}

variable "web_force_destroy" {
  description = "Permite borrar el bucket web aunque tenga objetos."
  type        = bool
  default     = false
}

variable "api_origin_domain_name" {
  description = "Dominio del origen de la API. Debe coincidir con un certificado válido del origen (por ejemplo un registro propio hacia el ALB o el endpoint de API Gateway). Null desactiva la distribución de la API."
  type        = string
  default     = null
}

variable "api_aliases" {
  description = "Dominios de la API, por ejemplo api.example.com."
  type        = list(string)
  default     = []
}

variable "api_origin_read_timeout" {
  description = "Segundos que CloudFront espera la respuesta del origen. Entre 1 y 180 (más de 60 requiere subir la cuota)."
  type        = number
  default     = 60

  validation {
    condition     = var.api_origin_read_timeout >= 1 && var.api_origin_read_timeout <= 180
    error_message = "api_origin_read_timeout debe estar entre 1 y 180."
  }
}

variable "api_origin_verify_header_value" {
  description = "Valor del encabezado X-Origin-Verify que CloudFront agrega hacia el origen, para que el ALB rechace tráfico que no pasó por CloudFront. Null no lo agrega."
  type        = string
  default     = null
  sensitive   = true
}

variable "price_class" {
  description = "Clase de precio de CloudFront."
  type        = string
  default     = "PriceClass_100"

  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.price_class)
    error_message = "price_class debe ser PriceClass_100, PriceClass_200 o PriceClass_All."
  }
}

variable "content_security_policy" {
  description = "Content-Security-Policy de las respuestas. Null no la agrega: la web Flutter necesita una a medida."
  type        = string
  default     = null
}

variable "hsts_max_age_seconds" {
  description = "max-age de Strict-Transport-Security."
  type        = number
  default     = 63072000
}

variable "logging_bucket_domain_name" {
  description = "Dominio de un bucket S3 (<nombre>.s3.amazonaws.com) para los logs de acceso de CloudFront. Debe permitir ACL. Null desactiva los logs."
  type        = string
  default     = null
}

variable "waf_block_mode" {
  description = "true bloquea las peticiones que coinciden con una regla. false solo las cuenta, para afinar reglas antes de bloquear."
  type        = bool
  default     = true
}

variable "waf_rate_limit" {
  description = "Peticiones por IP en 5 minutos antes del bloqueo, sobre todo el tráfico."
  type        = number
  default     = 2000

  validation {
    condition     = var.waf_rate_limit >= 10
    error_message = "waf_rate_limit debe ser al menos 10."
  }
}

variable "waf_auth_path_prefix" {
  description = "Prefijo de las rutas de autenticación con un límite de tasa más estricto contra relleno de credenciales."
  type        = string
  default     = "/auth/"
}

variable "waf_auth_rate_limit" {
  description = "Peticiones por IP en 5 minutos sobre waf_auth_path_prefix."
  type        = number
  default     = 100

  validation {
    condition     = var.waf_auth_rate_limit >= 10
    error_message = "waf_auth_rate_limit debe ser al menos 10."
  }
}

variable "waf_logging_enabled" {
  description = "Envía los logs de WAF a un log group cifrado con KMS en us-east-1."
  type        = bool
  default     = true
}

variable "waf_log_retention_days" {
  description = "Días de retención de los logs de WAF."
  type        = number
  default     = 90
}

variable "tags" {
  description = "Etiquetas adicionales para los recursos del módulo."
  type        = map(string)
  default     = {}
}
