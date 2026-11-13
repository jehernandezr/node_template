# Configuración de tflint para todo backend/infra/terraform. CI la pasa con ruta absoluta
# (--config) porque --recursive la buscaría en cada módulo.
config {
  call_module_type = "local"
}

plugin "terraform" {
  enabled = true
  preset  = "recommended"
}

# Reglas de AWS: tipos de instancia, clases de RDS y ElastiCache, runtimes, etc.
# Renovate (gestor tflint-plugin) propone las subidas.
plugin "aws" {
  enabled = true
  version = "0.50.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}
